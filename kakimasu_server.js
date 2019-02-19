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
var scores = {};

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
        
        console.log("Nouvel utilisateur : " + currentID);
        // envoi d'un message de bienvenue à ce client
        socket.emit("bienvenue", id);
        // envoi aux autres clients 
        socket.broadcast.emit("message", { from: null, to: null, text: currentID + " a rejoint la partie !", date: Date.now() } );
        // envoi de la nouvelle liste à tous les clients connectés 
        io.sockets.emit("liste", Object.keys(clients));
		// envoi des scores à tous les clients
		io.sockets.emit("score", Object.values(scores));
    });
    
    
    /**
     *  Réception d'un message et transmission à tous.
     *  @param  msg     Object  le message à transférer à tous  
     */
    socket.on("message", function(msg) {
        console.log("Reçu message");   
        // si jamais la date n'existe pas, on la rajoute
        msg.date = Date.now();
		console.log(msg.text +" "+ mot);
		if ((msg.text > mot) || (msg.text < mot)) {
        	io.sockets.emit("message", msg);
		}
		else {
			msg.text = msg.from+" à trouvé !";
			scores[msg.from] += 500;
			msg.from = "juste";
			msg.to = null;
        	io.sockets.emit("message", msg);
			io.sockets.emit("score", Object.values(scores));
		}
    });

    /** 
     *  Gestion du Jeu
     */
	var mot;
	
	socket.on("go", function() {
		var i = 0;
		socket.emit("player", Object.keys(clients)[i]);
		socket.on("mot", function(m) {
			mot = m;
		});
		
	});
	/*setInterval(function(){
		if(clients[currentID] == clients[clients.length-1]) {
			socket.broadcast.emit("startRound", Object.keys(clients)[0]);
		}
		else {
			socket.broadcast.emit("startRound", Object.keys(clients)[currentID+1]);
		}		
	}, 30000);*/
	socket.on("draw", function (data) {
		clear_history = [];
		arc_history.push(data);
		socket.broadcast.emit("trait", arc_history);
	});
	socket.on("drawClear", function (data) {
		arc_history = [];
		clear_history.push(data);
		socket.broadcast.emit("gomme", clear_history);
	});
	socket.on("newKaki", function () {
		arc_history = [];
		clear_history = [];
		socket.broadcast.emit("newKaki");
	});
    

    /** 
     *  Gestion des déconnexions
     */
    
    // fermeture
    socket.on("logout", function() {
        // si client était identifié (devrait toujours être le cas)
        if (currentID) {
            console.log("Sortie de l'utilisateur " + currentID);
            // envoi de l'information de déconnexion
            socket.broadcast.emit("message", 
                { from: null, to: null, text: currentID + " a quitté la partie.", date: Date.now() } );
                // suppression de l'entrée
            delete clients[currentID];
            // envoi de la nouvelle liste pour mise à jour
            socket.broadcast.emit("liste", Object.keys(clients));
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
            delete clients[currentID];
            // envoi de la nouvelle liste pour mise à jour
            socket.broadcast.emit("liste", Object.keys(clients));
        }
        console.log("Client déconnecté");
    });
    
    
});
