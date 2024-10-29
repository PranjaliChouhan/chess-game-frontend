import { useEffect, useState, useCallback } from "react";
import Container from "@mui/material/Container";
import Game from "./components/Game";
import InitGame from "./components/InitGame";
import CustomDialog from "./components/CustomDialog";
import socket from "./socket";
import { TextField } from "@mui/material";

export default function App() {
  const [username, setUsername] = useState("");
  const [usernameSubmitted, setUsernameSubmitted] = useState(false);
  const [room, setRoom] = useState("");
  const [orientation, setOrientation] = useState("");
  const [players, setPlayers] = useState([]);

  const cleanup = useCallback(() => {
    setRoom("");
    setOrientation("");
    setPlayers([]);
  }, []);

  useEffect(() => {
    socket.on("opponentJoined", (roomData) => {
      setPlayers(roomData.players);
    });

    return () => {
      socket.off("opponentJoined");
    };
  }, []);

  useEffect(() => {
    const tg = window?.Telegram?.WebApp;

    if (tg) {
      tg.ready();
      tg.expand();
      tg.MainButton.setText("Send Data");
      tg.MainButton.show();

      tg.MainButton.onClick(() => {
        tg.sendData("Some data to send back to bot");
      });
    }
  }, []);

  return (
    <Container>
      <CustomDialog
        open={!usernameSubmitted}
        handleClose={() => setUsernameSubmitted(true)}
        title="Pick a username"
        contentText="Please select a username"
        handleContinue={() => {
          if (!username.trim()) return;
          socket.emit("username", username);
          setUsernameSubmitted(true);
        }}
      >
        <TextField
          autoFocus
          margin="dense"
          id="username"
          label="Username"
          name="username"
          value={username}
          required
          onChange={(e) => setUsername(e.target.value)}
          type="text"
          fullWidth
          variant="standard"
        />
      </CustomDialog>
      {room ? (
        <Game
          room={room}
          orientation={orientation}
          username={username}
          players={players}
          cleanup={cleanup}
        />
      ) : (
        <InitGame
          setRoom={setRoom}
          setOrientation={setOrientation}
          setPlayers={setPlayers}
        />
      )}
    </Container>
  );
}
