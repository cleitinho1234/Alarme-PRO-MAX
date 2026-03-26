const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let users = {};
let messages = [];

// Carregar dados existentes
if (fs.existsSync("users.json")) users = JSON.parse(fs.readFileSync("users.json"));
if (fs.existsSync("messages.json")) messages = JSON.parse(fs.readFileSync("messages.json"));

// Salvar perfil
app.post("/saveProfile", (req, res) => {
    const { id, username, photo } = req.body;
    users[id] = { username, photo };
    fs.writeFileSync("users.json", JSON.stringify(users));
    res.send({ success: true });
});

// Pegar perfil de um usuário
app.get("/getUser/:id", (req, res) => {
    const user = users[req.params.id];
    if (user) res.send(user);
    else res.status(404).send({ error: "Usuário não encontrado" });
});

// Enviar mensagem
app.post("/sendMessage", (req, res) => {
    const { fromId, toId, text } = req.body;
    messages.push({ fromId, toId, text, timestamp: Date.now() });
    fs.writeFileSync("messages.json", JSON.stringify(messages));
    res.send({ success: true });
});

// Receber mensagens de um usuário
app.get("/getMessages/:id", (req, res) => {
    const id = req.params.id;
    const userMessages = messages.filter(m => m.fromId === id || m.toId === id);
    res.send(userMessages);
});

app.listen(3000, () => console.log("Servidor rodando em http://localhost:3000"));
