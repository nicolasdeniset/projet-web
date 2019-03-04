// Chargement des modules 
var express = require('express');
var app = express();
var server = app.listen(8080, function() {
    console.log("C'est parti ! En attente de connexion sur le port 8080...");
});

// Ecoute sur les websockets
var io = require('socket.io').listen(server);

// Configuration d'express pour utiliser le répertoire "public"
app.use(express.static('public'));
// set up to 
app.get('/', function(req, res) {  
    res.sendFile(__dirname + '/public/html/kakimasu.html');
});

/*** Gestion des parties ***/

var partie = {
	clients: {},	// id -> socket
	scores: {},		// Liste des scores
	joueurs: [],	// Tableau de joueurs
	vies: {},		// Tableau de vies
	nbtrouve: 0,
	oneLifeLeft: 0,		// Variable pour savoir si tous les joueurs n'ont plus qu'un seul essaie	
	useHelp: false, // Booleen qui permet de savoir si l'utilisateur utilise l'aide
	mot: "",		// Syllabe a trouver
	player: 0,		// Compteur pour savoir qui doit dessiner
	rounds: 5,		// Compteur du nombres de tours
	time: 30,		// Durée de chaques manches (en secondes)
	fini: true,
	alphabet: (Math.random() < 0.5) ? "hiragana" : "katakana", // Alphabet qui sera utilisé
	arc_history: [],	// Tableau de tout les traits.
	clear_history: [] 
};

var serveur = [];

// Quand un client se connecte, on le note dans la console
io.on('connection', function (socket) {
    // message de debug
    console.log("Un client s'est connecté");
    var currentID = null;

	socket.on("create", function(tab) {
		var i = serveur.length;
		if (i == 0) {
			serveur[0] = Object.create(partie);
			i++;
		}
		serveur[i] = Object.create(partie);
        serveur[i].rounds = tab[1];
		serveur[i].time = tab[2];
		serveur[i].alphabet = tab[0];
		serveur[i].joueurs = [];
		socket.emit("num", i);
	});
	socket.on("randomGame", function() {
		if (serveur.length == 0) {
			serveur[0] = Object.create(partie);
		}
		socket.emit("num", 0);
	});		

    socket.on("login", function(id, num) {
		console.log(id+" "+num);
        while (serveur[num].clients[id]) {
            id = id + "(1)";   
        }
        currentID = id;
        serveur[num].clients[currentID] = socket;
		serveur[num].scores[currentID] = 0;
		serveur[num].vies[currentID] = 3;
        serveur[num].joueurs.push(currentID);
        
        console.log("Nouvel utilisateur : " + currentID + " (Partie : " + num + ")");
        // envoi d'un message de bienvenue à ce client
        socket.emit("bienvenue", id);
        // envoi aux autres clients 
        socket.broadcast.emit("message", { from: null, to: null, text: currentID + " a rejoint la partie !", date: Date.now() }, num );
        // envoi de la nouvelle liste à tous les clients connectés 
        io.sockets.emit("liste", serveur[num].joueurs, num);
		// envoi des scores à tous les clients
		io.sockets.emit("score", Object.values(serveur[num].scores), num);
		// envoi du nombres de tours
		io.sockets.emit("rounds", serveur[num].rounds, num);
		// envoi du temps de chaques manches
		io.sockets.emit("temps", serveur[num].time, num);
		// envoi de l'alphabet utilisé
		io.sockets.emit("alphabet", serveur[num].alphabet, num);
		});
    
    
	/**
	*  Réception d'un message et transmission à tous.
	*  @param  msg     Object  le message à transférer à tous  
	*/
	socket.on("message", function(msg, num) {
		console.log("Reçu message (Partie : " + num + ")");   
		// si jamais la date n'existe pas, on la rajoute
		msg.date = Date.now();
		if ((msg.text > serveur[num].mot) || (msg.text < serveur[num].mot)) {
			serveur[num].vies[msg.from]--;
			io.sockets.emit("message", msg, num);
			if(serveur[num].vies[msg.from] == 1) {
				serveur[num].oneLifeLeft++;
			}
		}
		else {
			msg.text = msg.from+" à trouvé !";
			io.sockets.emit("playingGoodSound", msg.from, num);
			serveur[num].scores[msg.from] += serveur[num].joueurs.length*100 - serveur[num].nbtrouve*100;
			if(serveur[num].useHelp) {
				serveur[num].scores[serveur[num].joueurs[serveur[num].player]] += (serveur[num].vies[msg.from]*75)/2;
			}
			else {
				serveur[num].scores[serveur[num].joueurs[serveur[num].player]] += serveur[num].vies[msg.from]*75;
			}
           		serveur[num].nbtrouve++;
			msg.to = msg.from;
			msg.from = "juste";
			io.sockets.emit("message", msg, num);
			io.sockets.emit("score", Object.values(serveur[num].scores), num);
			if(serveur[num].nbtrouve == serveur[num].joueurs.length-1) {
				serveur[num].nbtrouve = 0;
				endRound(num);
			}
		}
		if(serveur[num].oneLifeLeft == serveur[num].joueurs.length-1) {
			io.sockets.emit("playingBadSound", parseInt(Math.random()*7)+1, num);
			serveur[num].oneLifeLeft = 0;
		}
		for (var i=0; i<serveur[num].joueurs.length; i++) {
			if (serveur[num].vies[Object.keys(serveur[num].clients)[i]] != 0) {
				if (i != serveur[num].player) {
					serveur[num].fini = false;
				}
			}
		}
		if (serveur[num].fini) {
			endRound(num);
		}
	});

    /** 
     *  Gestion du Jeu
     */
	socket.on("go", function(num) {
        socket.emit("player", serveur[num].joueurs[0], num);		
	});
	socket.on("mot", function(m, num) {
		serveur[num].mot = m;
	});
	socket.on("draw", function(data, num) {
		serveur[num].clear_history = [];
		serveur[num].arc_history.push(data);
		socket.broadcast.emit("trait", serveur[num].arc_history, num);
	});
	socket.on("drawClear", function(data, num) {
		serveur[num].arc_history = [];
		serveur[num].clear_history.push(data);
		socket.broadcast.emit("gomme", serveur[num].clear_history, num);
	});
	socket.on("newKaki", function(num) {
		serveur[num].arc_history = [];
		serveur[num].clear_history = [];
		socket.broadcast.emit("newKaki", num);
	});
	socket.on("useHelp", function(num) {
		serveur[num].useHelp = true;
	});
	socket.on("endRound", function(num) {
		endRound(num);
	});

	function endRound(num) {
		serveur[num].useHelp = false;
		io.sockets.emit("stop", serveur[num].joueurs[serveur[num].player], num);
		io.sockets.emit("message", { from: null, to: null, text: "Fin de la manche. Le mot était : "+ serveur[num].mot, date: Date.now() }, num );
		for (var i=0; i<serveur[num].joueurs.length; i++) {
			serveur[num].vies[Object.keys(serveur[num].clients)[i]] = 3;
		}
		if(serveur[num].player == serveur[num].joueurs.length-1) {
			serveur[num].rounds--;
			if(serveur[num].rounds == 0){
				io.sockets.emit("endGame", num);
				return;
			}
			serveur[num].player = 0;
		}
		else {
			serveur[num].player++;
		}
		io.sockets.emit("player", serveur[num].joueurs[serveur[num].player], num);
	}
	socket.on("leaveRound", function(num) {
		io.sockets.emit("message", { from: null, to: null, text: "Le dessinateur a quitté. Le mot était : "+ mot, date: Date.now() }, num );
		for (var i=0; i<serveur[num].joueurs.length; i++) {
			serveur[num].vies[Object.keys(serveur[num].clients)[i]] = 3;
		}
		io.sockets.emit("player", serveur[num].joueurs[serveur[num].player], num);
	});
    
	/** 
	*  Gestion des déconnexions
	*/
    
	// fermeture
	socket.on("logout", function(d, num) {
		// si client était identifié (devrait toujours être le cas)
		if (currentID) {
			console.log("Sortie de l'utilisateur " + currentID);
			// envoi de l'information de déconnexion
			socket.broadcast.emit("message", 
			{ from: null, to: null, text: currentID + " a quitté la partie.", date: Date.now() }, num );
			// suppression de l'entrée
			for (var i=0; i<serveur[num].joueurs.length; i++){
				if(currentID == serveur[num].joueurs[i]) {
					serveur[num].joueurs.splice(i, 1);
					if(d) {
						if(serveur[num].player == serveur[num].joueurs.length-1) {
							serveur[num].rounds--;
							if(serveur[num].rounds == 0){
								delete serveur[num].clients[currentID];
								delete serveur[num].scores[currentID];
								delete serveur[num].vies[currentID];
								io.sockets.emit("endGame", num);
								return;
							}
							serveur[num].player = 0;
						}
						else {
							serveur[num].player++;
						}
					}
				}
			}
			delete serveur[num].clients[currentID];
			delete serveur[num].scores[currentID];
			delete serveur[num].vies[currentID];
			// envoi de la nouvelle liste pour mise à jour
			io.sockets.emit("disconnectListe", serveur[num].joueurs, Object.values(serveur[num].scores), num);
		}
	});
    
	// déconnexion de la socket
	socket.on("disconnect", function(reason) { 
		// si client était identifié
		if (currentID) {
			for (var i=0; i<serveur.length; i++) {
				for (var j=0; j<serveur[i].joueurs.length; j++) {
					if (currentID == serveur[i].joueurs[j]) {
						var num = i;
					}
				}
			}
			// envoi de l'information de déconnexion
			socket.broadcast.emit("message", 
		        { from: null, to: null, text: currentID + " vient de se déconnecter de l'application.", date: Date.now() }, num );
			// suppression de l'entrée
			if(serveur[num].joueurs[serveur[num].player] == currentID) {
				for (var i=0; i<serveur[num].joueurs.length; i++){
					if(currentID == serveur[num].joueurs[i]) {
						serveur[num].joueurs.splice(i, 1);
					}
				}
				delete serveur[num].clients[currentID];
				delete serveur[num].scores[currentID];
				delete serveur[num].vies[currentID];
				if(serveur[num].player == serveur[num].joueurs.length-1) {
				serveur[num].rounds--;
					if(serveur[num].rounds == 0){
						io.sockets.emit("endGame", num);
						return;
					}
					serveur[num].player = 0;
				}
				else {
					serveur[num].player++;
				}
				for (var i=0; i<serveur[num].joueurs.length; i++) {
					serveur[num].vies[Object.keys(serveur[num].clients)[i]] = 3;
				}
				io.sockets.emit("player", serveur[num].joueurs[serveur[num].player], num);
			}
			else {
				for (var i=0; i<serveur[num].joueurs.length; i++){
					if(currentID == serveur[num].joueurs[i]) {
						serveur[num].joueurs.splice(i, 1);
					}
				}
				delete serveur[num].clients[currentID];
				delete serveur[num].scores[currentID];
				delete serveur[num].vies[currentID];
			}
			// envoi de la nouvelle liste pour mise à jour
			io.sockets.emit("disconnectListe", serveur[num].joueurs, Object.values(serveur[num].scores), num);
		}
		console.log("Client déconnecté");
		});
    
    
});
