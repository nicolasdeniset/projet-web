// Chargement des modules 
var express = require('express');
var app = express();
var server = app.listen(8080, function() {
    console.log("C'est parti ! En attente de connexion sur le port 8080...");
});

// Ecoute sur les websockets
var io = require('socket.io').listen(server);

// Tableau de tout les traits.
var arc_history = [];
var clear_history = [];

// Configuration d'express pour utiliser le répertoire "public"
app.use(express.static('public'));
// set up to 
app.get('/', function(req, res) {  
    res.sendFile(__dirname + '/public/html/kakimasu.html');
});

/*** Gestion des clients et des connexions ***/

var clients = {};       // id -> socket
var scores = {};	// Liste des scores
var joueurs = [];	// Tableau de joueurs
var vies = {};      // Tableau de vies
var nbtrouve = 0;
var useHelp = false; // Booleen qui permet de savoir si l'utilisateur utilise l'aide
var mot;	// Syllabe a trouver
var player = 0; // Compteur pour savoir qui doit dessiner
var rounds = 3; // Compteur du nombres de tours
var time = 30; // Durée de chaques manches (en secondes)
var alphabet = (Math.random() < 0.5) ? 'hiragana' : 'katakana'; // Alphabet qui sera utilisé

// Quand un client se connecte, on le note dans la console
io.on('connection', function (socket) {
    // message de debug
    console.log("Un client s'est connecté");
    var currentID = null;
    
    /**
     *  Doit être la première action après la connexion.
     *  @param  id  string  l'identifiant saisi par le client
     */
    socket.on("login", function(id) {
        while (clients[id]) {
            id = id + "(1)";   
        }
        currentID = id;
        clients[currentID] = socket;
	scores[currentID] = 0;
	vies[currentID] = 3;
        joueurs.push(currentID);
        
        console.log("Nouvel utilisateur : " + currentID);
        // envoi d'un message de bienvenue à ce client
        socket.emit("bienvenue", id);
        // envoi aux autres clients 
        socket.broadcast.emit("message", { from: null, to: null, text: currentID + " a rejoint la partie !", date: Date.now() } );
        // envoi de la nouvelle liste à tous les clients connectés 
        io.sockets.emit("liste", Object.keys(clients));
	// envoi des scores à tous les clients
	io.sockets.emit("score", Object.values(scores));
	// envoi du nombres de tours
	io.sockets.emit("rounds", rounds);
	// envoi du temps de chaques manches
	io.sockets.emit("temps", time);
	// envoi de l'alphabet utilisé
	io.sockets.emit("alphabet", alphabet);
    });
    
    
	/**
	*  Réception d'un message et transmission à tous.
	*  @param  msg     Object  le message à transférer à tous  
	*/
	socket.on("message", function(msg) {
		console.log("Reçu message");   
		// si jamais la date n'existe pas, on la rajoute
		msg.date = Date.now();
		if ((msg.text > mot) || (msg.text < mot)) {
			vies[msg.from]--;
			io.sockets.emit("message", msg);
			console.log(msg.from+" "+vies[msg.from]);
		}
		else {
			console.log(msg.from+" "+vies[msg.from]);
			msg.text = msg.from+" à trouvé !";
			scores[msg.from] += joueurs.length*100 - nbtrouve*100;
			if(useHelp) {
				scores[joueurs[player]] += (vies[msg.from]*75)/2;
			}
			else {
				scores[joueurs[player]] += vies[msg.from]*75;
			}
            		nbtrouve++;
			msg.to = msg.from;
			msg.from = "juste";
			io.sockets.emit("message", msg);
			io.sockets.emit("score", Object.values(scores));
			if(nbtrouve == joueurs.length-1) {
				nbtrouve = 0;
				endRound();
			}
		}
		var fini = true;
		for (var i=0; i<joueurs.length; i++) {
			if (vies[Object.keys(clients)[i]] != 0) {
				if (i != player) {
					fini = false;
				}
			}
		}
		console.log(fini);
		if (fini) {
			endRound();
		}
	});

    /** 
     *  Gestion du Jeu
     */
	socket.on("create", function(tab) {
        	rounds = tab[1];
		time = tab[2];
		alphabet = tab[0];
	});
	socket.on("go", function() {
        socket.emit("player", joueurs[0]);		
	});
	socket.on("mot", function(m) {
		mot = m;
	});
	socket.on("draw", function(data) {
		clear_history = [];
		arc_history.push(data);
		socket.broadcast.emit("trait", arc_history);
	});
	socket.on("drawClear", function(data) {
		arc_history = [];
		clear_history.push(data);
		socket.broadcast.emit("gomme", clear_history);
	});
	socket.on("newKaki", function() {
		arc_history = [];
		clear_history = [];
		socket.broadcast.emit("newKaki");
	});
	socket.on("useHelp", function() {
		useHelp = true;
	});
	socket.on("endRound", endRound);
	function endRound() {
		useHelp = false;
		io.sockets.emit("stop", joueurs[player]);
		io.sockets.emit("message", { from: null, to: null, text: "Fin de la manche. Le mot était : "+ mot, date: Date.now() } );
		for (var i=0; i<joueurs.length; i++) {
			vies[Object.keys(clients)[i]] = 3;
		}
		if(player == joueurs.length-1) {
			rounds--;
			if(rounds == 0){
				io.sockets.emit("endGame");
				return;
			}
			player = 0;console.log("player0");
		}
		else {
			player++;console.log("player++");
		}
		io.sockets.emit("player", joueurs[player]);
	}
	socket.on("leaveRound", function() {
		io.sockets.emit("message", { from: null, to: null, text: "Le dessinateur a quitté. Le mot était : "+ mot, date: Date.now() } );
		for (var i=0; i<joueurs.length; i++) {
			vies[Object.keys(clients)[i]] = 3;
		}
		io.sockets.emit("player", joueurs[player]);
	});
    
	/** 
	*  Gestion des déconnexions
	*/
    
	// fermeture
	socket.on("logout", function(d) {
		// si client était identifié (devrait toujours être le cas)
		if (currentID) {
			console.log("Sortie de l'utilisateur " + currentID);
			// envoi de l'information de déconnexion
			socket.broadcast.emit("message", 
			{ from: null, to: null, text: currentID + " a quitté la partie.", date: Date.now() } );
			// suppression de l'entrée
			for (var i=0; i<joueurs.length; i++){
				if(currentID == joueurs[i]) {
					joueurs.splice(i, 1);
					if(d) {
						if(player == joueurs.length-1) {
							rounds--;
							if(rounds == 0){
							delete clients[currentID];
							delete scores[currentID];
							delete vies[currentID];
							io.sockets.emit("endGame");
							return;
							}
							player = 0;
						}
						else {
							player++;
						}
					}
				}
			}
			delete clients[currentID];
			delete scores[currentID];
			delete vies[currentID];
			// envoi de la nouvelle liste pour mise à jour
			io.sockets.emit("disconnectListe", Object.keys(clients), Object.values(scores));
		}
	});
    
	// déconnexion de la socket
	socket.on("disconnect", function(reason) { 
		// si client était identifié
		if (currentID) {
			// envoi de l'information de déconnexion
			socket.broadcast.emit("message", 
		        { from: null, to: null, text: currentID + " vient de se déconnecter de l'application.", date: Date.now() } );
			// suppression de l'entrée
			if(joueurs[player] == currentID) {
				for (var i=0; i<joueurs.length; i++){
					if(currentID == joueurs[i]) {
						joueurs.splice(i, 1);
					}
				}
				delete clients[currentID];
				delete scores[currentID];
				delete vies[currentID];
				if(player == joueurs.length-1) {
				rounds--;
					if(rounds == 0){
						io.sockets.emit("endGame");
						return;
					}
					player = 0;
				}
				else {
					player++;
				}
				for (var i=0; i<joueurs.length; i++) {
					vies[Object.keys(clients)[i]] = 3;
				}console.log("wtf");
				io.sockets.emit("player", joueurs[player]);
			}
			else {
				for (var i=0; i<joueurs.length; i++){
					if(currentID == joueurs[i]) {
						joueurs.splice(i, 1);
					}
				}
				delete clients[currentID];
				delete scores[currentID];
				delete vies[currentID];
			}
			// envoi de la nouvelle liste pour mise à jour
			io.sockets.emit("disconnectListe", Object.keys(clients), Object.values(scores));
		}
		console.log("Client déconnecté");
		});
    
    
});
