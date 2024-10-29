import { useState, useMemo, useCallback, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import CustomDialog from "./CustomDialog";
import socket from "../socket";
import {
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Stack,
  Typography,
  Box,
} from "@mui/material";

export default function Game({ players, room, orientation, cleanup }) {
  const chess = useMemo(() => new Chess(), []); // <- 1
  const [fen, setFen] = useState(chess.fen()); // <- 2
  const [over, setOver] = useState("");
  const [turn, setTurn] = useState("white"); // State to track turn
  const [timer, setTimer] = useState(20); // Timer state


  const makeAMove = useCallback(
    (move) => {
      try {
        const result = chess.move(move); // update Chess instance
        setFen(chess.fen()); // update fen state to trigger a re-render
        setTurn(chess.turn() === "w" ? "white" : "black"); // Update turn


        console.log("over, checkmate", chess.isGameOver(), chess.isCheckmate());

        if (chess.isGameOver()) {
          // check if move led to "game over"
          if (chess.isCheckmate()) {
            // if reason for game over is a checkmate
            // Set message to checkmate.
            setOver(
              `Checkmate! ${chess.turn() === "w" ? "black" : "white"} wins!`
            );
            // The winner is determined by checking which side made the last move
          } else if (chess.isDraw()) {
            // if it is a draw
            setOver("Draw"); // set message to "Draw"
          } else {
            setOver("Game over");
          }
        }

        return result;
      } catch (e) {
        return null;
      } // null if the move was illegal, the move object if the move was legal
    },
    [chess]
  );
  useEffect(() => {
    socket.on("closeRoom", ({ roomId }) => {
      if (roomId === room) {
        cleanup();
      }
    });
  }, [room, cleanup]);
  useEffect(() => {
    socket.on("playerDisconnected", (player) => {
      setOver(`${player.username} has disconnected`); // set game over
    });
  }, []);
  useEffect(() => {
    socket.on("move", (move) => {
      makeAMove(move); //
    });
  }, [makeAMove]);
  // onDrop function
  function onDrop(sourceSquare, targetSquare) {
    // orientation is either 'white' or 'black'. game.turn() returns 'w' or 'b'
    if (chess.turn() !== orientation[0]) return false; // <- 1 prohibit player from moving piece of other player

    if (players.length < 2) return false; // <- 2 disallow a move if the opponent has not joined

    const moveData = {
      from: sourceSquare,
      to: targetSquare,
      color: chess.turn(),
      promotion: "q", // promote to queen where possible
    };

    const move = makeAMove(moveData);

    // illegal move
    if (move === null) return false;

    socket.emit("move", {
      // <- 3 emit a move event.
      move,
      room,
    }); // this event will be transmitted to the opponent via the server
    resetTimer();
    return true;
  }

  useEffect(() => {
    if (over) return; // Stop timer if game is over

    // Countdown logic
    const timerId = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          setOver(`Time's up! ${turn === "white" ? "Black" : "White"} wins!`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId); // Clear timer on unmount
  }, [turn, over]);

  // Reset timer to 20 seconds after a move
  const resetTimer = () => {
    setTimer(20);
  };
  // Game component returned jsx
  return (
    <Stack>
      <Card>
        <CardContent>
          <Typography variant="h5">Room ID: {room}</Typography>
        </CardContent>
      </Card>
      <Stack flexDirection="row" sx={{ pt: 2 }}>
        <div
          className="board"
          style={{
            maxWidth: 600,
            maxHeight: 600,
            flexGrow: 1,
          }}
        >
          <Chessboard
            position={fen}
            onPieceDrop={onDrop}
            boardOrientation={orientation}
          />
        </div>
        {players.length > 0 && (
          <Box>
            <List>
              <ListSubheader>Players</ListSubheader>
              {players.map((p) => (
                <ListItem key={p.id}>
                  <ListItemText primary={p.username} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Stack>
      <Stack>
      <h2>Current Turn: {turn}</h2>
      <h3>Time Left: {timer} seconds</h3>
      </Stack>
      <CustomDialog // Game Over CustomDialog
        open={Boolean(over)}
        title={over}
        contentText={over}
        handleContinue={() => {
          socket.emit("closeRoom", { roomId: room });
          setOver("");
          cleanup();
        }}
      />
    </Stack>
  );
}
