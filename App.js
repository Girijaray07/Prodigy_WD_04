import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const port = 3000;
const httpServer = createServer(app);
const io = new Server(httpServer);

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render('index');
});

io.on('connection', (socket) => {
    console.log(`user connected ${socket.id}`);

    socket.on('move', (data) => {
        io.emit('move', data);
    });

    socket.on('disconnect', () => {
        console.log(`user disconnected ${socket.id}`);
    });
});

httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`http://localhost:${port}`);
})