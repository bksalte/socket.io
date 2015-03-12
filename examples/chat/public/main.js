$(function() {
    var FADE_TIME = 150; // ms
    var TYPING_TIMER_LENGTH = 400; // ms
    var COLORS = [
        '#e21400', '#91580f', '#f8a700', '#f78b00',
        '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
        '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ];

    // Init variabler
    var $window = $(window);
    var $usernameInput = $('.usernameInput'); // Input for username
    var $messages = $('.messages'); // Messages area
    var $inputMessage = $('.inputMessage'); // Input message input box
    var $userLi = $('.users'); //brukerlisten
    var userlist = {} ;

    var $loginPage = $('.login.page'); // login siden
    var $chatPage = $('.chat.page'); // chatrom siden

    // Prompt for å sette brukernavn
    var username;
    var connected = false;
    var typing = false;
    var lastTypingTime;
    var $currentInput = $usernameInput.focus();

    var socket = io();

    /*  function addSmiley() {
     var $el = $(".messageBody"), replaced, smiley, check, imgSrc;

     check = $el.text().match(/((?::|;|=)(?:-)?(?:\)|D|P)|(\bkappa))/);

     smiley = check[0];

     if(smiley === ':-)') {
     imgSrc = 'smiley_1';
     } else if (smiley === ';-)') {
     imgSrc = 'smiley_2';
     }

     replaced = $el.text().replace(smiley, '<img src=' + imgSrc + ' />');
     $el.html(replaced);

     }   */

    function addParticipantsMessage (data) {
        var message = '';
        if (data.numUsers === 1) {
            message += "Det er 1 deltager i chatrommet";

        } else {
            message += "Det er " + data.numUsers + " deltagere i chattrommet!";

        }

        log(message);
    }


    // Setter klientens brukernavn
    function setUsername () {
        username = cleanInput($usernameInput.val().trim());

        // "if" brukernavnet er gyldig
        if (username) {
            $loginPage.fadeOut();
            $chatPage.show();
            $loginPage.off('click');
            $currentInput = $inputMessage.focus();
            var index ;
            // Forteller serveren ditt brukernavn
            socket.emit('add user', username);

        }
    }


    // Sender en beskjed/chatlinje
    function sendMessage () {
        var message = $inputMessage.val();
        // Forhindrer input injection
        message = cleanInput(message);
        // om beskjeden ikke er tom og det er en socket tilkobling
        if (message && connected) {
            $inputMessage.val('');
            addChatMessage({
                username: username,
                message: message
            });
            // Forteller serveren å utføre 'new message' og sende ett parameter som er beskjeden
            socket.emit('new message', message);
            // addSmiley();
        }
    }

    // Logger en beskjed
    function log (message, options) {
        var $el = $('<li>').addClass('log').text(message);
        addMessageElement($el, options);
    }

    //Legger den visuelle beskjeden til beskjedlisten
    function addChatMessage (data, options) {
        //Ikke fade beskjeden inn om det er en 'xxx skriver'
        var $typingMessages = getTypingMessages(data);
        options = options || {};
        if ($typingMessages.length !== 0) {
            options.fade = false;
            $typingMessages.remove();
        }


        var $usernameDiv = $('<span class="username"/>')
            .text(data.username)
            .css('color', getUsernameColor(data.username));
        var $messageBodyDiv = $('<span class="messageBody">')
            .text(data.message);

        var typingClass = data.typing ? 'typing' : '';
        var $messageDiv = $('<li class="message"/>')
            .data('username', data.username)
            .addClass(typingClass)
            .append($usernameDiv, $messageBodyDiv);

        addMessageElement($messageDiv, options);
    }

    //Legger til den visuelle 'xxx skriver' beskjeden i chatten
    function addChatTyping (data) {
        data.typing = true;
        data.message = 'is typing';
        addChatMessage(data);
    }

    // Fjerner den visuelle 'xxx skriver' beskjeden i chatten
    function removeChatTyping (data) {
        getTypingMessages(data).fadeOut(function () {
            $(this).remove();
        });
    }

    // Legger ett melding element til meldinger og scroller til bunnen
    // el - elementet for å legge til som en melding
    // options.fade - Om elementet skal fade-in (default = true)
    // options.prepend - om elementet skal prepend
    //   alle andre beskjeder (default = false)
    function addMessageElement (el, options) {
        var $el = $(el);

        // Setter default options
        if (!options) {
            options = {};
        }
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = false;
        }

        // Bruk options
        if (options.fade) {
            $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
            $messages.prepend($el);
        } else {
            $messages.append($el);
        }
        $messages[0].scrollTop = $messages[0].scrollHeight;
    }

    //hindrer input fra å ha injiserende text ol. forhåpentligvis..../sanitering
    function cleanInput (input) {
        return $('<div/>').text(input).text();
    }

    //Oppdaterer 'skriver' eventet
    function updateTyping () {
        if (connected) {
            if (!typing) {
                typing = true;
                socket.emit('typing');
            }
            lastTypingTime = (new Date()).getTime();

            setTimeout(function () {
                var typingTimer = (new Date()).getTime();
                var timeDiff = typingTimer - lastTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    socket.emit('stop typing');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    }

    //Henter 'xxx skriver' beskjeden til en bruker
    function getTypingMessages (data) {
        return $('.typing.message').filter(function (i) {
            return $(this).data('username') === data.username;
        });
    }

    //Henter fargen av et brukernavn gjennom hash funksjon
    function getUsernameColor (username) {
        // bergener hash koden
        var hash = 7;
        for (var i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + (hash << 5) - hash;
        }
        // beregner fargen
        var index = Math.abs(hash % COLORS.length);
        return COLORS[index];

    }

    // Tastatur events

    $window.keydown(function (event) {
        // Auto-focus the current input when a key is typed
        if (!(event.ctrlKey || event.metaKey || event.altKey)) {
            $currentInput.focus();
        }
        // Når bruker trykker enter på tastaturet
        if (event.which === 13) {
            if (username) {
                sendMessage();
                socket.emit('stop typing');
                typing = false;
            } else {
                setUsername();
            }
        }
    });

    $inputMessage.on('input', function() {
        updateTyping();
    });

    // Klikk  events

    // FOKUSER INPUT NÅR BRUKER KLIKKER HVORSOMHELST PÅ LOGIN SIDEN
    $loginPage.click(function () {
        $currentInput.focus();
    });

    // Fokuser input når man klikker på input border
    $inputMessage.click(function () {
        $inputMessage.focus();
    });

    // Socket events

    // Når serveren "emitter" 'login' log loginn beskjed
    socket.on('login', function (data) {
        connected = true;
        // Vis velkommen beskjed
        var message = "Velkommen til Pressfire Chat!! ";
        log(message, {
            prepend: true
        });
        addParticipantsMessage(data);
    });

    //  Når serveren "emitter" 'new message', oppdater chat body
    socket.on('new message', function (data) {
        var text = $('span.messageBody').html();
        text = text.replace('lol', 'faen');
        $('span.messageBody').html(text);

        addChatMessage(data);
    });

    //  Når serveren "emitter" 'user joined' log det i chat body
    socket.on('user joined', function (data) {
        log(data.username + ' joined');
        addParticipantsMessage(data);

        console.log(data);
        $('ul.userList').append('<li>' + data.username + '</li>');

    });

    socket.on('add users', function(d) {
        $('ul.userList').empty();
        for(var i in d.list) {
            console.log(d.list[i])
            $('ul.userList').append('<li>'+d.list[i]+'</li>');

        }
    });

    //Når serveren "emitter" 'user left', log det til chat body
    socket.on('user left', function (data) {
        log(data.username + ' left');
        addParticipantsMessage(data);
        removeChatTyping(data);


        $('ul.userList').empty();

        for(var i in data.list) {
            console.log(data.list[i])
            $('ul.userList').append('<li>'+ data.list[i] +'</li>');

        }
    });



    // Når serveren "emitter" 'typing', vis beskjeden i chat
    socket.on('typing', function (data) {
        addChatTyping(data);
    });

    // Når serveren "emitter" 'stop typing', ikke vis typing beskjeden i chat
    socket.on('stop typing', function (data) {
        removeChatTyping(data);
    });
});
