var alphabet; // Alphabet qui sera utilisé
var user; // Pseudo de l'utilisateur
var rounds // Nombre de tours pour chaque partie
var time // Temps de chaque tours de jeu

document.addEventListener("DOMContentLoaded", function() {
	// Affichage du formulaire pour rejoindre une partie
	joinGame();

	// L'utilisateur souhaite rejoindre une partie
	document.getElementById("play").addEventListener("click", recuperationInfo, false);

	// L'utilisateur souhaite créer sa partie
	document.getElementById("create").addEventListener("click", createGame, false);

	// Création de la partie de l'utilisateur
	document.getElementById("start").addEventListener("click", recuperationInfo, false);

	// L'utilisateur ne souhaite plus créer de partie. Affichage du premier formulaire
	document.getElementById("back").addEventListener("click", joinGame, false);
});


// Fonction qui permet de récuperer les éléments du formulaire
function recuperationInfo() {
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

	if(user != "") {
		
	}
}

function joinGame() {
	// Affichage du formulaire pour rejoindre une partie
	document.getElementById("suffixes").style.display = "none";
	document.getElementById("prefixes").style.display = "none";
	document.getElementById("parametres").style.display = "none";
	document.getElementById("textPseudo").style.display = "none";
	document.getElementById("play").style.display = "block";
	document.getElementById("create").style.display = "block"; avatar();
}

// Fonction qui permet d'afficher le formulaire de création de partie
function createGame() {
	document.getElementById("suffixes").style.display = "block";
	document.getElementById("prefixes").style.display = "block";
	document.getElementById("parametres").style.display = "block";
	document.getElementById("play").style.display = "none";
	document.getElementById("create").style.display = "none";
}

function resizeAvatar(x) {
	var avatar = document.getElementById("avatar");
	document.getElementById(x).width = avatar.clientWidt/10;
        document.getElementById(x).height = avatar.clientHeight/10;
}

function avatar() {console.log("avatar");
	document.getElementById("colors").style.backgroundImage = "url(\"../images/avatar/color/1.png\")";
	resizeAvatar("colors");
	document.getElementById("hairs").style.backgroundImage = "url(\"../images/avatar/hairs/6.png\")";
	resizeAvatar("hairs");
	document.getElementById("faces").style.backgroundImage = "url(\"../images/avatar/faces/1.png\")";
	resizeAvatar("faces");
	document.getElementById("eyes").style.backgroundImage = "url(\"../images/avatar/eyes/1.png\")";
	resizeAvatar("eyes");
	document.getElementById("beard").style.backgroundImage = "url(\"../images/avatar/beard/1.png\")";
	resizeAvatar("beard");
}
