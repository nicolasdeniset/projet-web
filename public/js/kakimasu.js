var socket = io.connect('http://localhost:8080');
var user;
var clients = {};
var scores = {};

var objGlyphes = null;
var glyphes = [];
var alphabet = (Math.random() < 0.5) ? 'hiragana' : 'katakana';
var solution;
var buttonPressed = false;
var x = 0;
var y = 0;
var size = 30;
var radCommande = "trait";
var trait;
var gomme;

document.addEventListener("DOMContentLoaded", async function() {
	//Alphabet
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

	//Chat
	connect();
	document.getElementById("btnEnvoyer").addEventListener("click", send, false);
	document.addEventListener("keypress", function(e) {
		if(e.key === 'Enter') {
			send();
		}
	});

	//Nouveau tour toutes les 30 secondes.
	

	//Dessin
	socket.emit("go");
	/*socket.on("startRound", function(p) {
		console.log("test2");
		user = p;
		newKaki();
		socket.emit("go");
		//window.location.reload(true);
	});*/	
	socket.on("player", function(p) {
		if (user == p) {
			displayElement("block","none");
			start();
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
	});
});

//API Chat
function connect() {
	
	user = "B";
	//user = document.getElementById("pseudo").value;
	//document.getElementById("logScreen").style.display = "none";
	//document.getElementById("content").style.display = "block";
	socket.emit("login", user);
	recep();
}

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
	console.log("send");
	var m = document.getElementById("monMessage").value;
	socket.emit("message", { from: user, to: null, text: m, date: Date.now() });
	document.getElementById("monMessage").value = "";	
}

function disconnect() {
	document.getElementById("logScreen").style.display = "block";
	document.getElementById("content").style.display = "none";
	socket.emit("logout");

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
	var showhelp = document.getElementById("showhelp");
	var showhelpContext = showhelp.getContext("2d");
	showhelpContext.font = "320px Comic Sans MS";
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
	}, 10000);
	syllabe1.addEventListener("click", function() {
		clearTimeout(time);
		shadow.style.display = "none";
		startRound.style.display = "none";
		var mot = document.getElementById("mot");
		mot.innerHTML = "<p>"+glyphes[0].key+"</p>";
		solution = glyphes[0];
	});
	syllabe2.addEventListener("click", function() {
		clearTimeout(time);
		shadow.style.display = "none";
		startRound.style.display = "none";
		var mot = document.getElementById("mot");
		mot.innerHTML = "<p>"+glyphes[1].key+"</p>";
		solution = glyphes[1];
	});
	syllabe3.addEventListener("click", function() {
		clearTimeout(time);
		shadow.style.display = "none";
		startRound.style.display = "none";
		var mot = document.getElementById("mot");
		mot.innerHTML = "<p>"+glyphes[2].key+"</p>";
		solution = glyphes[2];
	});
}

function displayElement(x,y) {
	document.getElementById("size").style.display = x;
	document.getElementById("clear").style.display = x;
	document.getElementById("help").style.display = x;
	document.getElementsByTagName("LABEL")[0].style.display = x;
	document.getElementsByTagName("LABEL")[1].style.display = x;
	document.getElementById("chat").style.display = y;
}

