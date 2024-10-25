import { io } from "socket.io-client"; // import connection function

// const socket = io('localhost:8080'); // initialize websocket connection
const socket = io('http://localhost:8080'); 

export default socket;