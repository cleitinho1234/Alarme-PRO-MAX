const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔥 CONEXÃO COM MONGODB
mongoose.connect("mongodb+srv://admin:123456mini@cluster0.j6xbddq.mongodb.net/miniZap?retryWrites=true&w=majority")
.then(() => console.log("Mongo conectado"))
.catch(err => console.log(err));

// MODELOS
const User = mongoose.model("User", {
    id: String,
    username: String,
    photo: String
});

const Message = mongoose.model("Message", {
    fromId: String,
    toId: String,
    text: String,
    timestamp: Number
});

// SALVAR PERFIL
app.post("/saveProfile", async (req, res) => {
    const { id, username, photo } = req.body;

    await User.findOneAndUpdate(
        { id },
        { username, photo },
        { upsert: true }
    );

    res.send({ success: true });
});

// PEGAR USUÁRIO
app.get("/getUser/:id", async (req, res) => {
    const user = await User.findOne({ id: req.params.id });

    if (user) res.send(user);
    else res.status(404).send({ error: "Usuário não encontrado" });
});

// ENVIAR MENSAGEM
app.post("/sendMessage", async (req, res) => {
    const { fromId, toId, text } = req.body;

    await Message.create({
        fromId,
        toId,
        text,
        timestamp: Date.now()
    });

    res.send({ success: true });
});

// RECEBER MENSAGENS
app.get("/getMessages/:id", async (req, res) => {
    const id = req.params.id;

    const msgs = await Message.find({
        $or: [
            { fromId: id },
            { toId: id }
        ]
    });

    res.send(msgs);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando"));
