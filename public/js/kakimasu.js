var socket = io.connect('http://localhost:8080');
var user; // Pseudo de l'utilisateur
var clients = {}; // Liste des clients
var scores = {}; // Liste des scores
var rounds; // Nombre de tours pour chaque partie
var time; // Temps de chaque tours de dessin
var vies = 3; // Nombre de message par manche que le joueur à le droit d'envoyer
var userPlaying = false;
var userLeave = false;

var objGlyphes = null; // Fichier json contenant les alphabets
var glyphes = []; // Tableau de 3 glyphes
var alphabet; // Alphabet qui sera utilisé
var solution; // Glyphe à trouver
var timeout; // Décompte avant la fin de la manche
var buttonPressed = false; // si on clic sur le dessin
var x = 0; // Position de la souris horizontale
var y = 0; // Position de la souris verticale
var size = 30; // Taille des outils de dessin
var radCommande = "trait"; // Outils actuellement utilisé pour le dessin
var trait; // Pinceau
var gomme; // Gomme
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
	// Fonctions liées a la connexion d'un nouvel utilisateur.
	// Affichage du formulaire pour rejoindre une partie
	joinGame();
	// L'utilisateur souhaite rejoindre une partie
	document.getElementById("play").addEventListener("click", recuperationInfo, false);
	// L'utilisateur souhaite créer sa partie
	document.getElementById("create").addEventListener("click", createForm, false);
	// Création de la partie de l'utilisateur
	document.getElementById("start").addEventListener("click", createGame, false);
	// L'utilisateur ne souhaite plus créer de partie. Affichage du premier formulaire
	document.getElementById("back").addEventListener("click", joinGame, false);
	
	// Fonctions liées au Chat
	document.getElementById("btnEnvoyer").addEventListener("click", send, false);
	document.addEventListener("keypress", function(e) {
		if(e.key === 'Enter') {
			send();
		}
	});

	// L'utilisateur se déconnecte
	document.getElementById("deconnexion").addEventListener("click", disconnect, false);

	// Redimension des canvas si la taille de la page est modifié
	window.addEventListener("resize", resizeCanvas);
	
		socket.on("endGame", function() {
			if(!userLeave) {
				var startRound = document.getElementById("startRound");
				var shadow = document.getElementById("shadow");
				shadow.style.display = "block";
				startRound.style.display = "block";
				startRound.innerHTML = "<p>Fin de la partie ! Le gagnant est :<br>Moi ! haha</p>";
			}
		});
		socket.on("stop", function(p) {
			if(user == p) {console.log("stop"+userLeave);
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
				displayElement("none","block");
				newKaki();
				buttonPressed = false;
			}
		});
		socket.on("disconnectListe", function(c,s) {
			clients = c;
			scores = s;
			getList(clients, scores);
		});
		socket.on("player", function(p) {console.log("player "+userLeave);
			if(!userLeave) {
			vies = 3;
			if (user == p) {
				userPlaying = true;
				displayElement("block","none");
				start();
				timeout = setTimeout(function() {
					socket.emit("endRound");
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
					displayElement("none","block");
					newKaki();
					buttonPressed = false;
				}, time * 1000);
				document.getElementById("clear").addEventListener("click", newKaki, false);
				document.getElementById("help").addEventListener("click", helpKaki, false);
				document.addEventListener("mousedown", buttonDown);
				document.addEventListener("mouseup", buttonRelease);
				document.addEventListener("mouseout", function(e) {
					var overlay = document.getElementById("overlay");
					var overlayContext = overlay.getContext("2d");
					overlayContext.clearRect(0, 0, overlay.width, overlay.height);
				});                      
				draw();
			}
			else {
				userPlaying = false;
				displayElement("none","block");
				socket.on("trait", function(data) {
					var dessin = document.getElementById("dessin");
					var dessinContext = dessin.getContext("2d");
					for(var i=0; i<data.length; i++) {
						dessinContext.beginPath();
						dessinContext.arc(data[i].mouseX, data[i].mouseY, data[i].sizeValue/2, 0, 2 * Math.PI);
						dessinContext.fill();
					}
				});
				socket.on("gomme", function(data) {
					var dessin = document.getElementById("dessin");
					var dessinContext = dessin.getContext("2d");
					for(var i=0; i<data.length; i++) {
						dessinContext.beginPath();
						dessinContext.clearRect(data[i].mouseX, data[i].mouseY, data[i].sizeValue, data[i].sizeValue);
					}
				});
				socket.on("newKaki", function() {
					var dessin = document.getElementById("dessin");
					var dessinContext = dessin.getContext("2d");
					dessinContext.clearRect(0, 0, dessin.width, dessin.height);
				});
			}
			}
		});
});

//API Connexion
// Fonction qui affiche le formulaire pour rejoindre une partie
function joinGame() {console.log("heho");
	// Affichage du formulaire pour rejoindre une partie
	document.getElementById("options").style.display = "block";
	document.getElementById("avatar").style.display = "block";
	//document.getElementById("choixAlphabet").style.display = "block";
	//document.getElementById("play").style.display = "block";
	//document.getElementById("back").style.display = "block";
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
	avatar();
}

// Fonction qui permet d'afficher le formulaire de création de partie
function createForm() {
	document.getElementById("suffixes").style.display = "block";
	document.getElementById("prefixes").style.display = "block";
	document.getElementById("parametres").style.display = "block";
	document.getElementById("avatar").style.display = "none";
	document.getElementById("play").style.display = "none";
	document.getElementById("create").style.display = "none";
}

// Fonction qui permet de créer une partie
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
		var tab = []
		tab[0] = alphabet;
		tab[1] = rounds;
		tab[2] = time;
		socket.emit("create", tab);
		recuperationInfo();
	}
	else {
		document.getElementById("textPseudo").style.display = "block";
	}
}

// Fonction qui permet de récuperer les éléments du formulaire
function recuperationInfo() {
	// Choix du pseudo de l'utilisateur
	user = document.getElementById("pseudo").value;

	// Si l'utilisateur a un pseudo correcte on le connecte au serveur
	if(user != "") {
		userLeave = false;
		// Affichage de la partie
		document.getElementById("deconnexion").style.display = "block";
		document.getElementById("mot").style.display = "block";
		document.getElementById("textPseudo").style.display = "none";
		document.getElementById("options").style.display = "none";
		document.getElementsByTagName("ASIDE")[0].style.display = "block";
		document.getElementsByTagName("MAIN")[0].style.display = "block";
		document.getElementsByTagName("SECTION")[0].style.display = "block";
		// Connexion au serveur
		connect();
		// Suppression des événements du formulaire
		document.getElementById("play").removeEventListener("click", recuperationInfo, false);
		document.getElementById("create").removeEventListener("click", createGame, false);
		document.getElementById("start").removeEventListener("click", recuperationInfo, false);
		document.getElementById("back").removeEventListener("click", joinGame, false);
	}
	else {
		document.getElementById("textPseudo").style.display = "block";
	}
}

// Fonction qui permet de connecter l'utilisateur au serveur et qui envoie son pseudo au serveur
function connect() {
	socket.emit("login", user);
	recep();
}	

//API Chat
function recep() {	
	socket.on("bienvenue", function(id) {
		user = id;
	});
	socket.on("message", function(param) {
		f = param.from;
		t = param.to;
		txt = param.text;
		d = new Date(param.date);
		message(txt);
	});
	socket.on("liste", function(c) {
		clients = c;
	});
	socket.on("score", function(s) {
		scores = s;
		getList(clients, scores);
	});
	socket.on("temps", function(t) {
		time = t;
	});
	socket.on("rounds", function(r) {
		rounds = r;
	});
	socket.on("alphabet", function(a) {
		alphabet = a;
	});
	// On redimensionne les canvas
	resizeCanvas();
	// Lancement de la partie
	socket.emit("go");
}

function getList(clients) {
	document.getElementsByTagName("ASIDE")[0].innerHTML = "";
	for (var i=0; i<clients.length; i++) {
		document.getElementsByTagName("ASIDE")[0].innerHTML += "<div>"+clients[i]+" : "+ scores[i] +" points</div>";
	}
}

function message(txt) {
		if(f != null) {
			if (f == "juste") {
				document.getElementsByTagName("SECTION")[0].innerHTML += "<div style=\"color:green;\">"+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+" - "+txt+"</div>";
			}
			else {
				document.getElementsByTagName("SECTION")[0].innerHTML += "<div>"+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+" - "+f+" : "+txt+"</div>";
			}
		}
		else {
			document.getElementsByTagName("SECTION")[0].innerHTML += "<div style=\"color:red;\">"+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+" - "+"[admin] : "+txt+"</div>";
		}
}

function send() {
	if (vies != 0) {
        	vies--;
		var m = document.getElementById("monMessage").value;
		socket.emit("message", { from: user, to: null, text: m, date: Date.now() });
		document.getElementById("monMessage").value = "";	
	}
}

function disconnect() {
	user = null;
	if(userPlaying) {
		socket.emit("logout", true);
		userLeave = true;
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
		newKaki();
		buttonPressed = false;
		socket.emit("leaveRound");
	}
	else {
		socket.emit("logout", false);
		userLeave = true;
	}
	// Affichage du formulaire pour rejoindre une partie
	joinGame();
	// L'utilisateur souhaite rejoindre une partie
	document.getElementById("play").addEventListener("click", recuperationInfo, false);
	// L'utilisateur souhaite créer sa partie
	document.getElementById("create").addEventListener("click", createForm, false);
	// Création de la partie de l'utilisateur
	document.getElementById("start").addEventListener("click", createGame, false);
	// L'utilisateur ne souhaite plus créer de partie. Affichage du premier formulaire
	document.getElementById("back").addEventListener("click", joinGame, false);

}

// API Dessin
function buttonDown() {
	buttonPressed = true;
}

function buttonRelease() {
	buttonPressed = false;
}

function mouseMove(e) {
	rect = e.target.getBoundingClientRect();
	x = e.clientX - rect.left;
	y = e.clientY - rect.top;
	draw();
}

function getTool() {
	trait = document.getElementById("trait");
	gomme = document.getElementById("gomme");
	if(trait.checked) { radCommande = "trait"; }
	if(gomme.checked) { radCommande = "gomme"; }
}

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

function draw() {
	getTool();
	size = document.getElementById("size").value;

	switch (radCommande) {
		case "trait": {
			var overlay = document.getElementById("overlay");
			var overlayContext = overlay.getContext("2d");
			overlayContext.clearRect(0, 0, overlay.width, overlay.height);
			overlayContext.fillStyle="black";
			overlay.addEventListener("mousemove", mouseMove);
			overlayContext.beginPath();
			overlayContext.arc(x, y, size/2, 0, 2 * Math.PI);
			overlayContext.fill(); 
				
			if(buttonPressed) {
				var dessin = document.getElementById("dessin");
				var dessinContext = dessin.getContext("2d");
				dessinContext.fillStyle="black";
				dessinContext.beginPath();
				dessinContext.arc(x, y, size/2, 0, 2 * Math.PI);
				socket.emit("draw", { mouseX: x, mouseY: y, sizeValue: size });
				dessinContext.fill();
				
			}
			break;
		}
		case "gomme": {
			var overlay = document.getElementById("overlay");
			var overlayContext = overlay.getContext("2d");
			overlayContext.clearRect(0, 0, overlay.width, overlay.height);
			overlayContext.strokeStyle = 'gray';
			overlayContext.beginPath();
			overlayContext.strokeRect(x-size/2, y-size/2, size, size);
			
			if(buttonPressed) {
				var dessin = document.getElementById("dessin");
				var dessinContext = dessin.getContext("2d");
				dessinContext.beginPath();
				dessinContext.clearRect(x-size/2, y-size/2, size, size);
				socket.emit("drawClear", { mouseX: x-size/2, mouseY: y-size/2, sizeValue: size });
			}
			break;
		}
		 default:
			break;
	}
}

function newKaki() {
	var dessin = document.getElementById("dessin");
	var dessinContext = dessin.getContext("2d");
	dessinContext.clearRect(0, 0, dessin.width, dessin.height);
	socket.emit("newKaki");
}

function clearHelp() {
	var showhelp = document.getElementById("showhelp");
	var showhelpContext = showhelp.getContext("2d");
	showhelpContext.clearRect(0, 0, showhelp.width, showhelp.height);
	document.getElementById("content").removeEventListener("mousedown", clearHelp, false);
}

function helpKaki() {
	socket.emit("useHelp");
	var showhelp = document.getElementById("showhelp");
	var showhelpContext = showhelp.getContext("2d");
	showhelpContext.font = "15.5vmax Comic Sans MS";
	showhelpContext.fillStyle = "black";
	showhelpContext.textAlign = "center";
	showhelpContext.fillText(String.fromCharCode(solution.ascii), showhelp.width/2, showhelp.height/2);
	document.getElementById("content").addEventListener("mousedown", clearHelp, false);
	document.getElementById("help").removeEventListener("click", helpKaki, false);
	
}

function getThreeGlyphes(x,objGlyphes) {
	var allKeys = Object.keys(objGlyphes[x]);
	var key;
	var threeGlyphes = [];
	for (var i=0; i < 3; i++) {
		do {
			key = allKeys[parseInt(Math.random()*allKeys.length,10)];
		} while(threeGlyphes.filter(e => e.key === key).length > 0)
		threeGlyphes[i] = { key: key, ascii: objGlyphes[x][key] };
	}

	return threeGlyphes;
}

function start() {
	glyphes = getThreeGlyphes(alphabet,objGlyphes);
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
	var time = setTimeout(function() {
		var rand = parseInt(Math.random()*2);
		shadow.style.display = "none";
		startRound.style.display = "none";
		var mot = document.getElementById("mot");
		mot.innerHTML = "<p>"+glyphes[rand].key+"</p>";
		solution = glyphes[rand];
		socket.emit("mot",solution.key);
	}, 10000);
	syllabe1.addEventListener("click", function() {
		clearTimeout(time);
		shadow.style.display = "none";
		startRound.style.display = "none";
		var mot = document.getElementById("mot");
		mot.innerHTML = "<p>"+glyphes[0].key+"</p>";
		solution = glyphes[0];
		socket.emit("mot",solution.key);
	});
	syllabe2.addEventListener("click", function() {
		clearTimeout(time);
		shadow.style.display = "none";
		startRound.style.display = "none";
		var mot = document.getElementById("mot");
		mot.innerHTML = "<p>"+glyphes[1].key+"</p>";
		solution = glyphes[1];
		socket.emit("mot",solution.key);
	});
	syllabe3.addEventListener("click", function() {
		clearTimeout(time);
		shadow.style.display = "none";
		startRound.style.display = "none";
		var mot = document.getElementById("mot");
		mot.innerHTML = "<p>"+glyphes[2].key+"</p>";
		solution = glyphes[2];
		socket.emit("mot",solution.key);
	});
}

function displayElement(x,y) {
	document.getElementById("size").style.display = x;
	document.getElementById("clear").style.display = x;
	document.getElementById("help").style.display = x;
	document.getElementsByTagName("LABEL")[22].style.display = x;
	document.getElementsByTagName("LABEL")[23].style.display = x;
	document.getElementById("chat").style.display = y;
}

function avatar() {console.log("avatar");

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

