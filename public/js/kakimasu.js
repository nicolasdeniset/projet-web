var socket = io.connect('http://localhost:8080'); // Connexion au serveur.

/* Informations du serveur */
var clients = []; // Tableau de clients
var scores = {}; // Liste des scores

/* Informations de la partie */
var idGame = 0; // Identifiant de la partie
var started = false; // Booléen qui indique si la partie a été lancé
var alphabet; // Alphabet qui sera utilisé
var rounds; // Nombre de tours pour chaque partie
var time; // Temps de chaque tours de dessin
var timeout; // Décompte avant la fin de la manche

/* Informations utiles pendant une manche */
var objGlyphes = null; // Fichier json contenant les alphabets
var glyphes = []; // Tableau de 3 glyphes
var solution; // Glyphe à trouver

/* Informations du joueur */
var user; // Pseudo de l'utilisateur
var vies = 3; // Nombre de message par manche que le joueur à le droit d'envoyer
var userPlaying = false; // Booléen qui permet de savoir si le joueur qui joue dessine
var userLeave = false; // Booléen qui permet de savoir si le joueur a quitté la partie

/* Informations du dessin */
var buttonPressed = false; // Booléen qui renvoie vrai lorsque l'utilisateur clic sur le dessin
var x = 0; // Position de la souris horizontale
var y = 0; // Position de la souris verticale
var size = 30; // Taille des outils de dessin
var radCommande = "trait"; // Outils actuellement utilisé pour le dessin
var trait; // Pinceau
var gomme; // Gomme

/* Informations des audio */
var userDrawing = false; // L'utilisateur a dessiné
var userSending = false; // L'utilisateur a essayer de trouvé la syllabe
var audioHelp = document.createElement("AUDIO"); // Audio joué pendant l'aide
var audioGood = document.createElement("AUDIO"); // Audio joué lorsque la solution est trouvée
var audioBad = document.createElement("AUDIO"); // Audio joué lorsque tout les joueurs n'ont plus qu'un essaie
var audioPlay = document.createElement("AUDIO"); // Audio joué lorsque l'utilisateur ne joue pas assez vite
var audioTimeout; // Timer avant que l'audio "audioplay" ne soit joué

var imgAvatar; // Image correspondant a l'avatar
var avatarColor = 1; // Variable pour definir le fond de l'avatar
var avatarHair = 1; // Variable pour definir les cheveux de l'avatar
var avatarFace = 1; // Variable pour definir le visage de l'avatar
var avatarEyes = 1; // Variable pour definir les yeux de l'avatar
var avatarBeard = 0; // Variable pour definir la barbe de l'avatar


document.addEventListener("DOMContentLoaded", async function() {
	// Récupération des alphabets
	if (typeof fetch !== undefined) {       
            // avec des promesses et l'instruction fetch
            var response = await fetch("../js/alphabet.json"); 
            if (response.status == 200) {
                var data = await response.json();
                objGlyphes = data;
            }
        }
        else {            
            // "à l'ancienne" avec un appel AJAX
            var xhttp = new XMLHttpRequest(); 
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    objGlyphes = JSON.parse(this.responseText);
                }
            }
            xhttp.open("GET", "../js/alphabet.json", true);
            xhttp.send();
        }
	
	/*
	 * Formulaires de connexions et de créations de partie
	 */
	joinGame(); // Affichage du formulaire pour rejoindre une partie aléatoire
	document.getElementById("play").addEventListener("click", randomGame, false); // L'utilisateur souhaite rejoindre une partie aléatoire
	document.getElementById("create").addEventListener("click", createForm, false); // L'utilisateur souhaite créer sa partie
	document.getElementById("join").addEventListener("click", joinForm, false); // L'utilisateur souhaite rejoindre la partie d'un amis
	document.getElementById("joinF").addEventListener("click", joinFriends, false); // L'utilisateur rejoint ses amis
	document.getElementById("backF").addEventListener("click", joinGame, false); // L'utilisateur ne souhaite plus rejoindre de partie. Affichage du premier formulaire	
	document.getElementById("start").addEventListener("click", createGame, false); // Création de la partie de l'utilisateur	
	document.getElementById("back").addEventListener("click", joinGame, false); // L'utilisateur ne souhaite plus créer de partie. Affichage du premier formulaire	
	document.getElementById("gogo").addEventListener("click", function() { // Lancement de la partie (partie privées)
		letsgo();
		speech("La partie vient de commencer. Bonne chance à tous !");
	}, false);
	
	/*
	 * Envoie de message dans le chat
	 */
	document.addEventListener("keypress", function(e) {
		if(e.key === 'Enter') {
			send();
		}
	});

	/*
	 * Deconnexion de l'utilisateur
	 */
	document.getElementById("deconnexion").addEventListener("click", disconnect, false);

	/*
	 * Redimension des canvas si la taille de la page est modifié
	 */
	window.addEventListener("resize", resizeCanvas);
	
	/*
	 * Fin de la partie, affichage du gagnant
	 */
	socket.on("endGame", function(num) {
		if(idGame == num) { // Vérification de l'identifiant de la partie
			if(!userLeave) { // Si l'utilisateur ne s'est pas déconnecté avant on lui affiche le gagnant
				var startRound = document.getElementById("startRound");
				var shadow = document.getElementById("shadow");
				shadow.style.display = "block";
				startRound.style.display = "block";
				startRound.innerHTML = "<p>Fin de la partie ! Le gagnant est :<br>Moi ! haha</p>";
				speech("Fin de la partie ! Le gagnant est Moi ! haha"); // Utilisation de la synthèse vocale
			}
			clearTimeout(audioTimeout); // Suppresion du timer de l'audioPlay
		}
	});

	/*
	 * Fin de la manche, passage à la manche suivante
	 */
	socket.on("stop", function(p, num) {
		if(idGame == num) { // Vérification de l'identifiant de la partie
			if(user == p) { // Suppresion des événements liés au dessinateur et du mot
				clearTimeout(timeout);
				document.removeEventListener("mousedown", buttonDown);
				document.removeEventListener("mouseup", buttonRelease);
				document.removeEventListener("mouseout", function(e) {
					var overlay = document.getElementById("overlay");
					var overlayContext = overlay.getContext("2d");
					overlayContext.clearRect(0, 0, overlay.width, overlay.height);
				});
				var mot = document.getElementById("mot");
				mot.innerHTML = "<p></p>";
				solution = null;
				displayElement("none","block"); // On enlève les outils de dessin et on affiche la barre d'envoie du chat
				newKaki(); // Suppresion du dessin
				buttonPressed = false; // L'utilisateur ne peux plus dessiner
			}
			clearTimeout(audioTimeout); // Suppresion du timer de l'audioPlay
		}
	});

	/*
	 * Actualisation des listes de clients et de scores lors de déconnexion
	 */
	socket.on("disconnectListe", function(c,s, num) {
		if(idGame == num) { // Vérification de l'identifiant de la partie
			clients = c;
			scores = s;
			getList(clients, scores); // Actualisation de l'affichage
		}
	});

	/*
	 * Lancement d'un audio pour féliciter l'utilisateur qui a trouvé la solution
	 */
	socket.on("playingGoodSound", function(p, num) {
		if(idGame == num) { // Vérification de l'identifiant de la partie
			if(user == p) { // Uniquement l'utilisateur ayant trouvé peut entendre ce son
				var randAudio = parseInt(Math.random()*3)+1; // Choix alétoire du son à jouer
				audioGood.setAttribute("src", "../sounds/sucess/"+randAudio+".mp3");
				restartAudio(); // Remise à zéro des sons
				if(playingAudio()){ audioGood.play(); } // Aucun son n'est joué on peut lancer celui ci
			}
		}
	});

	/*
	 * Lancement d'un audio qui injure tous les utilisateurs car ils n'ont plus qu'un seul essaie
	 */
	socket.on("playingBadSound", function(randAudio, num) {
		if(idGame == num) { // Vérification de l'identifiant de la partie
			audioBad.setAttribute("src", "../sounds/second_try/"+randAudio+".mp3");
			restartAudio(); // Remise à zéro des sons
			if(playingAudio()){ audioBad.play(); } // Aucun son n'est joué on peut lancer celui ci
		}
	});

	/*
	 * Execution de la manche pour chaque joueurs
	 */
	socket.on("player", function(p, num) {
		if((idGame == num)&&(!userLeave)) { // Vérification de l'identifiant de la partie et que l'utilisateur joue encore
			userDrawing = false; // Remise à zéro de la variable qui test si l'utilisateur a dessiné
			userSending = false; // Remise à zéro de la variable qui test si l'utilisateur a envoyé un message
			vies = 3; // Reinitialisation du nombre d'essaie
			/* Audio à lancer si l'utilisateur ne joue pas assez vite */
			audioTimeout = setTimeout(function() {
				if(user == p) { // Dessinateur
					if(!userDrawing) { // Si le dessinateur n'a pas dessiné
						audioPlay.setAttribute("src", "../sounds/play/"+(parseInt(Math.random()*2)+1)+".mp3");
						restartAudio(); // Remise à zéro des sons
						if(playingAudio()){ audioPlay.play(); } // Aucun son n'est joué on peut lancer celui ci
					}
				}
				else { // Devineur
					if(!userSending) { // Si le devineur n'a pas essayer de trouvé la solution
						audioPlay.setAttribute("src", "../sounds/play/"+(parseInt(Math.random()*2)+1)+".mp3");
						restartAudio(); // Remise à zéro des sons
						if(playingAudio()){ audioPlay.play(); } // Aucun son n'est joué on peut lancer celui ci
					}
				}
			}, (time*1000)/3);
			if (user == p) { // Partie dessinateur
				vies = 0; // Interdiction au dessinateur d'envoyer des messages
				userPlaying = true; // L'utilisateur dessine
				displayElement("block","none"); // Affichage des outils de dessin
				start(); // Lancement de la manche
				timeout = setTimeout(function() { // Lancement du décompte avant la fin de la manche
					socket.emit("endRound", idGame); // Fin de la manche
					/* Suppression des événements liés au dessin et suppresion du mot à deviner */
					document.removeEventListener("mousedown", buttonDown);
					document.removeEventListener("mouseup", buttonRelease);
					document.removeEventListener("mouseout", function(e) {
						var overlay = document.getElementById("overlay");
						var overlayContext = overlay.getContext("2d");
						overlayContext.clearRect(0, 0, overlay.width, overlay.height);
					});
					var mot = document.getElementById("mot");
						mot.innerHTML = "<p></p>";
					solution = null;
					displayElement("none","block"); // On masque les outils de dessin car l'utilisateur ne dessine plus
					newKaki(); // Suppression du dessin
					buttonPressed = false; // L'utilisateur ne peux plus dessiner
				}, time * 1000);
				/* Evénement lié au dessin */
				document.getElementById("clear").addEventListener("click", newKaki, false);
				document.getElementById("help").addEventListener("click", helpKaki, false);
				document.addEventListener("mousedown", buttonDown);
				document.addEventListener("mouseup", buttonRelease);
				document.addEventListener("mouseout", function(e) {
					var overlay = document.getElementById("overlay");
					var overlayContext = overlay.getContext("2d");
					overlayContext.clearRect(0, 0, overlay.width, overlay.height);
				});                      
				draw(); // Fonction pour dessiner
			}
			else { // Partie devineur
				userPlaying = false; // L'utilisateur ne dessine pas
				displayElement("none","block"); // Affichage de la barre d'envoie du chat
				/*
				 * Lorsque le dessinateur trace un trait on l'affiche dans le canvas pour tous les autres utilisateurs
				 * data est un tableau avec la position et la taille de chacun de traits
				 */
				socket.on("trait", function(data, num) {
					if(idGame == num) { // Vérification de l'identifiant de la partie
						var dessin = document.getElementById("dessin");
						var dessinContext = dessin.getContext("2d");
						for(var i=0; i<data.length; i++) {
							dessinContext.beginPath();
							dessinContext.arc(data[i].mouseX, data[i].mouseY, data[i].sizeValue/2, 0, 2 * Math.PI);
							dessinContext.fill();
						}
					}
				});
				/*
				 * Lorsque le dessinateur efface un trait on le supprime dans le canvas pour tous les autres utilisateurs
				 * data est un tableau avec la position et la taille de chacun de traits effacés
				 */
				socket.on("gomme", function(data, num) {
					if(idGame == num) { // Vérification de l'identifiant de la partie
						var dessin = document.getElementById("dessin");
						var dessinContext = dessin.getContext("2d");
						for(var i=0; i<data.length; i++) {
							dessinContext.beginPath();
							dessinContext.clearRect(data[i].mouseX, data[i].mouseY, data[i].sizeValue, data[i].sizeValue);
						}
					}
				});
				/*
				 * Lorsque le dessinateur supprime son dessin et recommence, on fait de même pour les autres utilisateurs
				 */
				socket.on("newKaki", function(num) {
					if(idGame == num) { // Vérification de l'identifiant de la partie
						var dessin = document.getElementById("dessin");
						var dessinContext = dessin.getContext("2d");
						dessinContext.clearRect(0, 0, dessin.width, dessin.height);
					}
				});
			}
		}
	});
});

/*
 * API Affichage des formulaires
 */
/* Fonction qui affiche le formulaire pour rejoindre une partie aléatoire */
function joinGame() {
	// Affichage du formulaire pour rejoindre une partie aléatoire
	document.getElementById("options").style.display = "block";
	document.getElementById("avatar").style.display = "block";
	document.getElementById("deconnexion").style.display = "none";
	document.getElementById("suffixes").style.display = "none";
	document.getElementById("prefixes").style.display = "none";
	document.getElementById("parametres").style.display = "none";
	document.getElementById("textPseudo").style.display = "none";
	document.getElementById("play").style.display = "block";
	document.getElementById("create").style.display = "block";
	document.getElementById("mot").style.display = "none";
	document.getElementsByTagName("ASIDE")[0].style.display = "none";
	document.getElementsByTagName("MAIN")[0].style.display = "none";
	document.getElementsByTagName("SECTION")[0].style.display = "none";
	document.getElementById("chat").style.display = "none";
	document.getElementById("join").style.display = "block";
	document.getElementById("joinF").style.display = "none";
	document.getElementById("idJoin").style.display = "none";
	document.getElementById("backF").style.display = "none";
	document.getElementById("gogo").style.display = "none";
	avatar();
}

/* Fonction qui permet d'afficher le formulaire de création de partie */
function createForm() {
	document.getElementById("suffixes").style.display = "block";
	document.getElementById("prefixes").style.display = "block";
	document.getElementById("parametres").style.display = "block";
	document.getElementById("avatar").style.display = "none";
	document.getElementById("play").style.display = "none";
	document.getElementById("create").style.display = "none";
	document.getElementById("join").style.display = "none";
	document.getElementById("joinF").style.display = "none";
	document.getElementById("idJoin").style.display = "none";
	document.getElementById("backF").style.display = "none";
	document.getElementById("gogo").style.display = "none";
}

/* Fonction qui permet d'afficher le formulaire pour rejoindre une partie privé */
function joinForm() {
	document.getElementById("choixAlphabet").style.display = "none";
	document.getElementById("avatar").style.display = "none";
	document.getElementById("play").style.display = "none";
	document.getElementById("create").style.display = "none";
	document.getElementById("join").style.display = "none";
	document.getElementById("joinF").style.display = "block";
	document.getElementById("idJoin").style.display = "block";
	document.getElementById("backF").style.display = "block";
	document.getElementById("gogo").style.display = "none";
}

/*
 * API Création de partie
 */
/* Fonction qui permet de créer une partie */
function createGame() {
	// Choix du pseudo de l'utilisateur
	user = document.getElementById("pseudo").value;

	// Choix de l'alphabet
	alphabet = document.querySelector('#options input[name=radGlyphe]:checked').value;
	// Si l'on souhaite utiliser les deux alphabets, un des deux sera choisi au hasard
        if (alphabet == "les2") {
            alphabet = (Math.random() < 0.5) ? 'hiragana' : 'katakana';   
        }

	// Choix du nombre de tours
	var selectRounds = document.getElementById("rounds");
	for(var i=0; i<selectRounds.options.length; i++) {
		if(selectRounds.options[i].selected) {
			rounds = selectRounds.options[i].value;
		}
	}

	// Choix du temps de chaque tours
	var selectTime = document.getElementById("time");
	for(var i=0; i<selectTime.options.length; i++) {
		if(selectTime.options[i].selected) {
			time = selectTime.options[i].value;
		}
	}

	// Si l'utilisateur a un pseudo correcte on le connecte au serveur
	if(user != "") {
		// Envoi des infos au serveur
		var tab = [];
		tab[0] = alphabet;
		tab[1] = rounds;
		tab[2] = time;
		socket.emit("create", tab); // Création de la partie par le serveur
		socket.on("num", function(num) { // Récupération de l'identifiant de la partie
			idGame = num;
			recuperationInfo(); // Affichage de la partie
		});
		document.getElementById("gogo").style.display = "block";
	}
	else {
		document.getElementById("textPseudo").style.display = "block"; // On indique que l'utilisateur a oublié de mettre un pseudo
	}
}

/* Fonction qui crée une partie aléatoire */
function randomGame() {
	started = true; // Partie prêt à être lancé
	socket.emit("randomGame"); // Création de la partie par le serveur
	recuperationInfo(); // Récupération des informations
}

/* Fonction qui permet de rejoindre une partie privé */
function joinFriends() {
	started = true; // Partie prêt à être lancé
	var idG = document.getElementById("idJoin").value;
	if(idG != "") {
		idGame = idG; // Identifiant mis par l'utilisateur
	}
	else { // L'utilisateur n'a pas mis l'identifiant de la partie
		idGame = 0;
	}
	recuperationInfo(); // Récupération des informations
}

/* Fonction qui permet de récuperer les éléments du formulaire */
function recuperationInfo() {
	// Choix du pseudo de l'utilisateur
	user = document.getElementById("pseudo").value;

	// Si l'utilisateur a un pseudo correcte on le connecte au serveur
	if(user != "") {
		createMyAvatar();
		userLeave = false;
		// Affichage de la partie
		document.getElementById("deconnexion").style.display = "block";
		document.getElementById("mot").style.display = "block";
		document.getElementById("textPseudo").style.display = "none";
		document.getElementById("options").style.display = "none";
		document.getElementsByTagName("ASIDE")[0].style.display = "block";
		document.getElementsByTagName("MAIN")[0].style.display = "block";
		document.getElementsByTagName("SECTION")[0].style.display = "block";
		document.getElementById("chat").style.display = "block";
		// Connexion au serveur
		connect();
		// Suppression des événements du formulaire
		document.getElementById("play").removeEventListener("click", randomGame, false);
		document.getElementById("create").removeEventListener("click", createGame, false);
		document.getElementById("start").removeEventListener("click", recuperationInfo, false);
		document.getElementById("back").removeEventListener("click", joinGame, false);
	}
	else {
		document.getElementById("textPseudo").style.display = "block"; // le pseudo n'est pas défini
	}
}

/*
 * API Connexion à une partie
 */
/* Fonction qui permet de connecter l'utilisateur au serveur et qui envoie son pseudo au serveur */
function connect() {
	socket.emit("login", user, idGame); // On connecte l'utilisateur à sa partie
	recep();
}

/*
 * API Chat
 */
/* Fonction qui initialise toutes les variables nécessaire au fonctionnement de la partie */
function recep() {
	if (idGame != 0) { // Affichage du numéro de partie privé pour inviter ses amis
		document.getElementById("numGame").innerHTML = "Numéro de Partie : " +idGame;
	}
	socket.on("bienvenue", function(id) {
		user = id; // Identifiant de l'utilisateur
	});
	socket.on("message", function(param, num) {
		if (idGame == num) { // Vérification de l'identifiant de la partie
			f = param.from;
			t = param.to;
			txt = param.text;
			d = new Date(param.date);
			message(txt);
		}
	});
	socket.on("liste", function(c, num) { // Liste des joueurs
		if (idGame == num) { // Vérification de l'identifiant de la partie
			clients = c;
			getList(clients);
		}
	});
	socket.on("score", function(s, num) { // Liste des scores
		if (idGame == num) { // Vérification de l'identifiant de la partie
			scores = s;
			getList(clients);
		}
	});
	socket.on("temps", function(t, num) { // Temps de chaque manche
		if (idGame == num) { // Vérification de l'identifiant de la partie
			time = t;
		}
	});
	socket.on("rounds", function(r, num) { // Nombres de tours
		if (idGame == num) { // Vérification de l'identifiant de la partie
			rounds = r;
		}
	});
	socket.on("alphabet", function(a, num) { // Alphabet à utiliser
		if (idGame == num) { // Vérification de l'identifiant de la partie
			alphabet = a;
		}
	});
	resizeCanvas(); // On redimensionne les canvas
	if (started) { // Si la partie commence on l'envoie au serveur
		socket.emit("go", idGame);
	}
}

/* Fonction qui permet de lancer la partie privé */
function letsgo() {
	document.getElementById("gogo").style.display = "none";
	// Lancement de la partie
	started = true;
	socket.emit("go", idGame); // On envoie au serveur que la partie commence
}

/* Fonction qui permet d'afficher la liste des joueurs et leur score */
function getList(clients) {
	document.getElementsByTagName("ASIDE")[0].innerHTML = "";
	for (var i=0; i<clients.length; i++) {
		document.getElementsByTagName("ASIDE")[0].innerHTML += "<div>"+clients[i]+" : "+ scores[i] +" points</div>";
	}
}

/* Fonction qui permet d'afficher les messages dans le chat */
function message(txt) {
		if(f != null) { // Message des devineurs
			if (f == "juste") { // Si le devineur a trouvé la solution on l'indique à tous les joueurs et on affiche pas la réponse
				document.getElementsByTagName("SECTION")[0].innerHTML += "<div style=\"color:green;\">"+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+" - "+txt+"</div>";
			}
			else { // Affichage de la proposition dans le chat
				document.getElementsByTagName("SECTION")[0].innerHTML += "<div>"+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+" - "+f+" : "+txt+"</div>";
			}
		}
		else { // Message d'information du serveur
			document.getElementsByTagName("SECTION")[0].innerHTML += "<div style=\"color:red;\">"+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+" - "+"[admin] : "+txt+"</div>";
		}
}

/* Fonction qui permet d'envoyer des messages dans le chat */
function send() {
	userSending = true; // L'utilisateur essaye de trouvé la solution
	if (vies != 0) { // L'utilisateur n'a plus la possibilité d'envoyer des messages si son nombre d'essaies est à zéro
        	vies--;
		var m = document.getElementById("monMessage").value;
		socket.emit("message", { from: user, to: null, text: m, date: Date.now() }, idGame); // Envoie du message au serveur
		document.getElementById("monMessage").value = "";	
	}
}

/* Fonction qui permet de déconnecter un utilisateur */
function disconnect() {
	user = null; // L'utilisateur n'a pas de pseudo
	if(userPlaying) { // Si l'utilisateur était le dessinateur
		socket.emit("logout", true, idGame); // Envoie au serveur que le dessinateur a quitté la partie
		userLeave = true; // L'utilisateur est parti
		clearTimeout(timeout); // Fin du timer de la manche
		/* Suppression des événements liés au dessin et suppresion du mot à deviner */
		document.removeEventListener("mousedown", buttonDown);
		document.removeEventListener("mouseup", buttonRelease);
		document.removeEventListener("mouseout", function(e) {
			var overlay = document.getElementById("overlay");
			var overlayContext = overlay.getContext("2d");
			overlayContext.clearRect(0, 0, overlay.width, overlay.height);
		});
		var mot = document.getElementById("mot");
		mot.innerHTML = "<p></p>";
		solution = null;
		newKaki(); // Suppression du dessin
		buttonPressed = false; // Impossible de redessiner
		socket.emit("leaveRound"); // Envoie au serveur que la manche est terminé car le dessinateur a quitté
	}
	else { // L'utilisateur était un devineur
		socket.emit("logout", false, idGame); // Envoie au seuveur qu'il a quitté la partie
		userLeave = true; // L'utilisateur est parti
	}
	joinGame(); // Affichage du formulaire pour rejoindre une partie
	document.getElementById("play").addEventListener("click", recuperationInfo, false); // L'utilisateur souhaite rejoindre une partie
	document.getElementById("create").addEventListener("click", createForm, false); // L'utilisateur souhaite créer sa partie
	document.getElementById("start").addEventListener("click", createGame, false); // Création de la partie de l'utilisateur
	document.getElementById("back").addEventListener("click", joinGame, false); // L'utilisateur ne souhaite plus créer de partie. Affichage du premier formulaire

}

/*
 * API Dessin
 */
/* Fonction qui permet de savoir quand l'utilisateur dessine */
function buttonDown() {
	buttonPressed = true;
}

/* Fonction qui permet de savoir quand l'utilisateur arrête de dessiner */
function buttonRelease() {
	buttonPressed = false;
}

/* Fonction qui détecte l'emplacement de la souris sur le canvas lorsqu'elle bouge */
function mouseMove(e) {
	rect = e.target.getBoundingClientRect();
	x = e.clientX - rect.left;
	y = e.clientY - rect.top;
	draw();
}

/* Fonction qui récupère l'outils utilisé */
function getTool() {
	trait = document.getElementById("trait");
	gomme = document.getElementById("gomme");
	if(trait.checked) { radCommande = "trait"; }
	if(gomme.checked) { radCommande = "gomme"; }
}

/* Fonction qui permet de redimensionner la taille des canvas en fonction de la taille de la page */
function resizeCanvas() {
	var content = document.getElementById("content");
	var dessin = document.getElementById("dessin");
	var showhelp = document.getElementById("showhelp");
	var overlay = document.getElementById("overlay");
	dessin.width = content.clientWidth;
        dessin.height = content.clientHeight;
	showhelp.width = content.clientWidth;
        showhelp.height = content.clientHeight;
	overlay.width = content.clientWidth;
        overlay.height = content.clientHeight;
}

/* Fonction qui permet à l'utilisateur de dessiner sur le canvas */
function draw() {
	getTool(); // Récupération de l'outils à utiliser
	size = document.getElementById("size").value; // Récupération de la taille du pinceau ou de la gomme

	switch (radCommande) {
		case "trait": { // Code permettant de tracer un trait
			var overlay = document.getElementById("overlay");
			var overlayContext = overlay.getContext("2d");
			overlayContext.clearRect(0, 0, overlay.width, overlay.height);
			overlayContext.fillStyle="black";
			overlay.addEventListener("mousemove", mouseMove);
			overlayContext.beginPath();
			overlayContext.arc(x, y, size/2, 0, 2 * Math.PI);
			overlayContext.fill(); 
				
			if(buttonPressed) { // On affiche le trait uniquement si l'utilisateur est entrain d'appuyer pour dessiner
				userDrawing = true; // L'utilisateur dessine
				var dessin = document.getElementById("dessin");
				var dessinContext = dessin.getContext("2d");
				dessinContext.fillStyle="black";
				dessinContext.beginPath();
				dessinContext.arc(x, y, size/2, 0, 2 * Math.PI);
				socket.emit("draw", { mouseX: x, mouseY: y, sizeValue: size }, idGame);
				dessinContext.fill();
				
			}
			break;
		}
		case "gomme": { // Code permettant d'effacer un trait
			var overlay = document.getElementById("overlay");
			var overlayContext = overlay.getContext("2d");
			overlayContext.clearRect(0, 0, overlay.width, overlay.height);
			overlayContext.strokeStyle = 'gray';
			overlayContext.beginPath();
			overlayContext.strokeRect(x-size/2, y-size/2, size, size);
			
			if(buttonPressed) { // On efface le trait uniquement si l'utilisateur est entrain d'appuyer pour effacer
				userDrawing = true; // L'utilisateur dessine
				var dessin = document.getElementById("dessin");
				var dessinContext = dessin.getContext("2d");
				dessinContext.beginPath();
				dessinContext.clearRect(x-size/2, y-size/2, size, size);
				socket.emit("drawClear", { mouseX: x-size/2, mouseY: y-size/2, sizeValue: size }, idGame);
			}
			break;
		}
		 default:
			break;
	}
}

/* Fonction qui supprime le dessin du canvas */
function newKaki() {
	var dessin = document.getElementById("dessin");
	var dessinContext = dessin.getContext("2d");
	dessinContext.clearRect(0, 0, dessin.width, dessin.height);
	socket.emit("newKaki", idGame); // On envoie au serveur que le dessinateur supprime son dessin
}

/* Fonction qui supprime l'aide sur le canvas du dessinateur dès qu'il recommence à dessiner */
function clearHelp() {
	/* Effacement de l'aide */
	var showhelp = document.getElementById("showhelp");
	var showhelpContext = showhelp.getContext("2d");
	showhelpContext.clearRect(0, 0, showhelp.width, showhelp.height);
	/* Suppresion de l'événement qui fait appelle à cette fonction */
	document.getElementById("content").removeEventListener("mousedown", clearHelp, false);
}

/* Fonction qui affiche le glyphe à dessiner sur le dessin si l'utilisateur souhaite de l'aide */
function helpKaki() {
	socket.emit("useHelp", idGame); // On envoie au serveur que le dessinateur a utilisé l'aide pour le prendre en compte dans le calcule du score
	/* Lancement du son de l'aide */
	audioHelp.setAttribute("src", "../sounds/help/honnetement_je_connais_pas_le_mot_la.mp3");
	restartAudio(); // On remet à zéro le son s'il a déjà été joué
	if(playingAudio()){ audioHelp.play(); } // Si aucun autre son est lancé on peut lancer le son
	/* Affichage de l'aide */
	var showhelp = document.getElementById("showhelp");
	var showhelpContext = showhelp.getContext("2d");
	showhelpContext.font = "15.5vmax Comic Sans MS";
	showhelpContext.fillStyle = "black";
	showhelpContext.textAlign = "center";
	showhelpContext.fillText(String.fromCharCode(solution.ascii), showhelp.width/2, showhelp.height/2);
	/* Dès que le dessinateur recommencera à dessiner l'aide disparaitra  */
	document.getElementById("content").addEventListener("mousedown", clearHelp, false);
	/* On supprime la possibilité d'avoir de nouveau accès à l'aide pendant la manche */
	document.getElementById("help").removeEventListener("click", helpKaki, false);
	
}

/* Fonction qui récupère trois syllable à partir de l'alphabet choisit */
function getThreeGlyphes(x,objGlyphes) {
	var allKeys = Object.keys(objGlyphes[x]); // Toutes les syllables
	var key;
	var threeGlyphes = [];
	for (var i=0; i < 3; i++) {
		do {
			key = allKeys[parseInt(Math.random()*allKeys.length,10)]; // Choix aléatoire
		} while(threeGlyphes.filter(e => e.key === key).length > 0)
		threeGlyphes[i] = { key: key, ascii: objGlyphes[x][key] };
	}

	return threeGlyphes;
}


/* Fonction qui initialise chaque manche
   propose à l'utilisateur de choisir entre trois syllabes à partir de l'alphabet défini à la création
   s'il n'en choisit aucune, la syllable a deviner sera choisit au hasard au bout de 10 secondes */
function start() {
	glyphes = getThreeGlyphes(alphabet,objGlyphes); // Tableau des trois syllables à choisir 
	var startRound = document.getElementById("startRound");
	var shadow = document.getElementById("shadow");
	var syllabe1 = document.getElementById("syllabe1");
	var syllabe2 = document.getElementById("syllabe2");
	var syllabe3 = document.getElementById("syllabe3");
	shadow.style.display = "block";
	startRound.style.display = "block";
	syllabe1.innerHTML = "<p>"+glyphes[0].key+"</p>";
	syllabe2.innerHTML = "<p>"+glyphes[1].key+"</p>";
	syllabe3.innerHTML = "<p>"+glyphes[2].key+"</p>";
	var time = setTimeout(function() { // Choix aléatoire d'une syllable au bout de 10 secondes
		var rand = parseInt(Math.random()*2);
		shadow.style.display = "none";
		startRound.style.display = "none";
		var mot = document.getElementById("mot");
		mot.innerHTML = "<p>"+glyphes[rand].key+"</p>";
		solution = glyphes[rand];
		socket.emit("mot",solution.key, idGame);
	}, 10000);
	/* Evénement en fonction de la syllable choisit
	   Dès que l'utilisateur a fait son choix on supprime le timer pour la syllable aléatoire
	   et on ajoute la syllable dans la variable solution avant de l'envoyer au serveur
	   puis l'utilisateur peut voir la syllable choisit et dessiner */
	syllabe1.addEventListener("click", function() {
		clearTimeout(time);
		shadow.style.display = "none";
		startRound.style.display = "none";
		var mot = document.getElementById("mot");
		mot.innerHTML = "<p>"+glyphes[0].key+"</p>";
		solution = glyphes[0];
		socket.emit("mot",solution.key, idGame);
	});
	syllabe2.addEventListener("click", function() {
		clearTimeout(time);
		shadow.style.display = "none";
		startRound.style.display = "none";
		var mot = document.getElementById("mot");
		mot.innerHTML = "<p>"+glyphes[1].key+"</p>";
		solution = glyphes[1];
		socket.emit("mot",solution.key, idGame);
	});
	syllabe3.addEventListener("click", function() {
		clearTimeout(time);
		shadow.style.display = "none";
		startRound.style.display = "none";
		var mot = document.getElementById("mot");
		mot.innerHTML = "<p>"+glyphes[2].key+"</p>";
		solution = glyphes[2];
		socket.emit("mot",solution.key, idGame);
	});
}

/* Fonction qui permet d'afficher/masquer les outils de dessin et masquer/afficher la barre d'envoie de chat */
function displayElement(x,y) {
	document.getElementById("size").style.display = x;
	document.getElementById("clear").style.display = x;
	document.getElementById("help").style.display = x;
	document.getElementsByTagName("LABEL")[22].style.display = x;
	document.getElementsByTagName("LABEL")[23].style.display = x;
	document.getElementById("monMessage").style.display = y;
}

function avatar() {

	document.getElementById("flecheD1").addEventListener("click", function() {
		if(avatarColor == 6){
			avatarColor = 1;
		}
		else {
			avatarColor++;
		}
		document.getElementById("colors").style.backgroundImage = "url(\"../images/avatar/color/"+avatarColor+".png\")";
	}, false);
	document.getElementById("flecheD2").addEventListener("click", function() {
		if(avatarHair == 18){
			avatarHair = 1;
		}
		else {
			avatarHair++;
		}
		document.getElementById("hairs").style.backgroundImage = "url(\"../images/avatar/hairs/"+avatarHair+".png\")";
	}, false);
	document.getElementById("flecheD3").addEventListener("click", function() {
		if(avatarFace == 6){
			avatarFace = 1;
		}
		else {
			avatarFace++;
		}
		document.getElementById("faces").style.backgroundImage = "url(\"../images/avatar/faces/"+avatarFace+".png\")";
	}, false);
	document.getElementById("flecheD4").addEventListener("click", function() {
		if(avatarEyes == 6){
			avatarEyes = 1;
		}
		else {
			avatarEyes++;
		}
		document.getElementById("eyes").style.backgroundImage = "url(\"../images/avatar/eyes/"+avatarEyes+".png\")";
	}, false);
	document.getElementById("flecheD5").addEventListener("click", function() {
		if(avatarBeard == 9){
			avatarBeard = 0;
		}
		else {
			avatarBeard++;
		}
		document.getElementById("beard").style.backgroundImage = "url(\"../images/avatar/beard/"+avatarBeard+".png\")";
	}, false);
	document.getElementById("flecheG1").addEventListener("click", function() {
		if(avatarColor == 1){
			avatarColor = 6;
		}
		else {
			avatarColor--;
		}
		document.getElementById("colors").style.backgroundImage = "url(\"../images/avatar/color/"+avatarColor+".png\")";
	}, false);
	document.getElementById("flecheG2").addEventListener("click", function() {
		if(avatarHair == 1){
			avatarHair = 18;
		}
		else {
			avatarHair--;
		}
		document.getElementById("hairs").style.backgroundImage = "url(\"../images/avatar/hairs/"+avatarHair+".png\")";
	}, false);
	document.getElementById("flecheG3").addEventListener("click", function() {
		if(avatarFace == 1){
			avatarFace = 6;
		}
		else {
			avatarFace--;
		}
		document.getElementById("faces").style.backgroundImage = "url(\"../images/avatar/faces/"+avatarFace+".png\")";
	}, false);
	document.getElementById("flecheG4").addEventListener("click", function() {
		if(avatarEyes == 1){
			avatarEyes = 6;
		}
		else {
			avatarEyes--;
		}
		document.getElementById("eyes").style.backgroundImage = "url(\"../images/avatar/eyes/"+avatarEyes+".png\")";
	}, false);
	document.getElementById("flecheG5").addEventListener("click", function() {
		if(avatarBeard == 0){
			avatarBeard = 9;
		}
		else {
			avatarBeard--;
		}
		document.getElementById("beard").style.backgroundImage = "url(\"../images/avatar/beard/"+avatarBeard+".png\")";
	}, false);
	
}

// Fonction qui sert a créer l'avatar une fois les élements choisi
function createMyAvatar() {
	var myAvatar = document.getElementById("avatarCanvas");
	var myAvatarContext = myAvatar.getContext("2d");

	// Définition de la taille de l'image.
	var colors = document.getElementById("colors");
	//myAvatar.width = colors.clientWidth;
        //myAvatar.height = colors.clientHeight;
	myAvatarContext.clearRect(0, 0, myAvatarContext.width, myAvatarContext.height);

	// Creation de l'image sur le canvas
	var imgColors = new Image();
	imgColors.src = "../images/avatar/color/"+avatarColor+".png";
        imgColors.onload = function() {
		myAvatarContext.drawImage(imgColors, 0, 0, myAvatar.width, myAvatar.height);
	}

	setTimeout(function() {
		var imgFace = new Image();
		imgFace.src = "../images/avatar/faces/"+avatarFace+".png";
		imgFace.onload = function() {
			myAvatarContext.drawImage(imgFace, 0, 0, myAvatar.width, myAvatar.height);
		}
	}, 100);

	setTimeout(function() {
		var imgHairs = new Image();
		imgHairs.src = "../images/avatar/hairs/"+avatarHair+".png";
		imgHairs.onload = function() {
			myAvatarContext.drawImage(imgHairs, 0, 0, myAvatar.width, myAvatar.height);
		}
	}, 200);
	
	setTimeout(function() {
		var imgEyes = new Image();
		imgEyes.src = "../images/avatar/eyes/"+avatarEyes+".png";
		imgEyes.onload = function() {
			myAvatarContext.drawImage(imgEyes, 0, 0, myAvatar.width, myAvatar.height);
		}
	}, 300);

	setTimeout(function() {
		var imgBeard = new Image();
		imgBeard.src = "../images/avatar/beard/"+avatarBeard+".png";
		imgBeard.onload = function() {
			myAvatarContext.drawImage(imgBeard, 0, 0, myAvatar.width, myAvatar.height);
		}
	}, 400);
	setTimeout(function() {
		imgAvatar = new Image();
		imgAvatar.src = myAvatar.toDataURL();
		//imgAvatar.style.width = "20%";
		//imgAvatar.style.height = "20%";
		var footercanvas = document.getElementById("footercanvas");
		var footercanvasContext = footercanvas.getContext("2d");
		imgAvatar.onload = function() {
			footercanvasContext.drawImage(imgAvatar, 0, 0, footercanvas.width, footercanvas.height);
		}
	}, 600);
}

/* Fonction qui permet de savoir si l'on peut lancé un enregistrement audio */
function playingAudio() {
	if(audioHelp.currentTime != 0){ return false; }
	if(audioGood.currentTime != 0){ return false; }
	if(audioBad.currentTime != 0){ return false; }
	if(audioPlay.currentTime != 0){ return false; }
	return true; // Aucun son n'est en cours d'execution on peut jouer un autre son
}

/* Fonction qui permet de remettre les audio au début s'ils sont terminés */
function restartAudio() {
	if(audioHelp.paused){ audioHelp.currentTime = 0 }
	if(audioGood.paused){ audioGood.currentTime = 0 }
	if(audioBad.paused){ audioBad.currentTime = 0 }
	if(audioPlay.paused){ audioPlay.currentTime = 0 }
}

/* Fonction qui permet d'utiliser la synthèse vocale si elle est disponible
   x étant la chaine à dire à haute voix  */
function speech(x) {
	if (("speechSynthesis" in window)) { 
		var enonciation = new SpeechSynthesisUtterance(x);
		window.speechSynthesis.lang = "fr-FR";
		var voices = [];
		speechSynthesis.getVoices().forEach(voice => {
	  		if(voice.lang == "fr-FR") {
				voices.push(voice);
			}
		})
		enonciation.voice = voices[0];
		enonciation.rate = 0.9;
		window.speechSynthesis.speak (enonciation);
	}
}
