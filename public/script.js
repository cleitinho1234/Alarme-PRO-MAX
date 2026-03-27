const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
app.use(express.json({ limit: "10mb" })); // IMPORTANTE pra foto
app.use(express.static(path.join(__dirname, "public")));

mongoose.connect("SUA_URL_MONGO")
  .then(() => console.log("Mongo conectado"))
  .catch(err => console.log(err));

// =========================
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

// =========================
// Criar usuário
app.post("/user", async (req, res) => {
  let id;

  while (true) {
    id = Math.floor(1000 + Math.random() * 9000).toString();
    const existe = await User.findOne({ id });
    if (!existe) break;
  }

  const user = new User({
    id,
    username: "Novo Usuário",
    photo: ""
  });

  await user.save();
  res.json(user);
});

// =========================
// SALVAR PERFIL
app.post("/saveProfile", async (req, res) => {
  const { id, username, photo } = req.body;

  const user = await User.findOneAndUpdate(
    { id },
    { username, photo },
    { new: true, upsert: true }
  );

  res.json(user);
});

// =========================
// Buscar usuário
app.get("/getUser/:id", async (req, res) => {
  const user = await User.findOne({ id: req.params.id });

  if (user) res.json(user);
  else res.status(404).json({ error: "Usuário não encontrado" });
});

// =========================
// Mensagens
app.post("/sendMessage", async (req, res) => {
  const { fromId, toId, text } = req.body;

  const msg = await Message.create({
    fromId,
    toId,
    text,
    timestamp: Date.now()
  });

  res.json(msg);
});

app.get("/getMessages/:id", async (req, res) => {
  const msgs = await Message.find({
    $or: [{ fromId: req.params.id }, { toId: req.params.id }]
  }).sort({ timestamp: 1 });

  res.json(msgs);
});

// =========================
app.listen(3000, () => console.log("Servidor rodando"));
