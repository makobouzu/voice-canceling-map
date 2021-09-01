const express = require('express');
const app = express();
require('dotenv').config();

app.use(express.static('public'));
app.use(express.json());

const fileUpload = require('express-fileupload');
app.use(fileUpload());
const uploadRouter = require('./routes/upload');
app.use('/upload', uploadRouter);

// const dbRouter = require('./routes/db');
// app.use('/db', dbRouter);

// setup osc
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const osc = require("osc");

const udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 54000,
    metadata: true
});

udpPort.open();

io.on('connection', (socket) => {
    console.log('user connected');
    socket.on('marker', obj => {
        console.log('/marker' + ': ' + obj.num);
        udpPort.send({
            address: "/marker",
            args: [
                {
                    type: "i",
                    value: obj.num
                }
            ]
            }, "127.0.0.1", 6969);
    });

    socket.on('video', obj => {
        console.log('/path' + ': ' + obj.path);
        udpPort.send({
            address: "/path",
            args: [
                {
                    type: "s",
                    value: obj.path
                }
            ]
            }, "127.0.0.1", 6970);
    });
    
    udpPort.on("message", function (oscMsg, timeTag, info) {
        if(oscMsg.address === "/inpaint_path"){
            let path = oscMsg.args[0].value;
            socket.emit('path', { value : path } );
        }
    });
});

http.listen(process.env.PORT || 9000, "0.0.0.0", () => {
    console.log('http://localhost:' + process.env.PORT + ' or 9000')
});
