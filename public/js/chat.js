// this file has access to some functionalities in the socket.io file
//defined in index.html (/socket.io/socket.io.js")
//connects the client with the server
const socket = io();

//elements
const sendMsgForm = document.querySelector('#message-form');
const messageFormInput = sendMsgForm.querySelector('input');
const messageFormButton = sendMsgForm.querySelector('button');
const locationButton = document.querySelector('#send-location');
const messagesDiv = document.querySelector('#messages');

//templates
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationTemplate = document.querySelector('#location-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

//options
//location.search contine username si room de la form-ul de join
//Qs(queryString) is a library loaded in chat.html
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

const autoscroll = () => {
    //new message element
    const $newMessage = messagesDiv.lastElementChild;

    //height of the new message
    //getComputed is a method globally available in the browser
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

    //Visible height
    const visibleHeight = messagesDiv.offsetHeight

    //Height of messages container
    const containerHeight = messagesDiv.scrollHeight;

    //How far have I scrolled?
    const scrollOffset = messagesDiv.scrollTop + visibleHeight;

    if (containerHeight - newMessageHeight <= scrollOffset) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

sendMsgForm.addEventListener('submit', (e) => {
    e.preventDefault();
    messageFormButton.setAttribute('disabled', 'disabled');

    const msg = document.querySelector('#txtMessage').value;

    //last param is a function to be ran when the event is AKNowledged
    socket.emit('sendMessage', msg,
        (error) => {
            messageFormButton.removeAttribute('disabled');
            messageFormInput.value = '';
            messageFormInput.focus();
            if (error) {
                return console.log(error);
            }

            console.log('Message delivered');
        });
});

//receive event from server
socket.on('message', (message) => {
    console.log(message);
    //mustache is a library loaded in chat.html
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a')
    });
    messagesDiv.insertAdjacentHTML('beforeend', html);
    autoscroll();
})

socket.on('locationMessage', (data) => {
    console.log(data);
    const html = Mustache.render(locationTemplate, {
        username: data.username,
        location: data.text,
        createdAt: moment(data.createdAt).format('h:mm a')
    })
    messagesDiv.insertAdjacentHTML('beforeend', html);
    autoscroll();
})

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html;
})

locationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by ur shit!');
    }
    locationButton.setAttribute('disabled', true);

    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            locationButton.removeAttribute('disabled');
            console.log('Location shared!');
        })
    })
})

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error);
        location.href = '/';
    }
});