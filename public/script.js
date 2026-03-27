let currentUser = null;
let currentChatUser = null;
let lastMessages = [];

// contatos
const contacts = JSON.parse(localStorage.getItem("contacts")) || [];

// =========================
// CARREGAR
window.addEventListener("load", async () => {
  let savedId = localStorage.getItem("userId");

  if (savedId) {
    const res = await fetch(`/getUser/${savedId}`);
    const user = await res.json();

    if (!user.error) currentUser = user;
  }

  if (!currentUser) {
    const res = await fetch("/user", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ username: "Novo Usuário", photo: "" })
    });

    currentUser = await res.json();
    localStorage.setItem("userId", currentUser.id);
  }

  document.getElementById("userIdDisplay").textContent = currentUser.id;
  document.getElementById("username").value = currentUser.username || "";

  if(currentUser.photo){
    document.getElementById("profilePreview").src = currentUser.photo;
  }

  renderContacts();
});

// =========================
// CONTATOS
function renderContacts() {
  const contactsDiv = document.getElementById("contacts");
  contactsDiv.innerHTML = "";

  contacts.forEach(user => {

    const div = document.createElement("div");
    div.textContent = user.username;

    div.addEventListener("click", (e) => {
      e.preventDefault();
      window.getSelection().removeAllRanges();

      abrirChat(user);
    });

    contactsDiv.appendChild(div);
  });
}

// =========================
// ABRIR CHAT
function abrirChat(user){
  currentChatUser = user;

  document.getElementById("home").style.display = "none";
  document.getElementById("chatBox").style.display = "block";

  document.getElementById("chatName").textContent = user.username;

  loadMessages(true);
}

// VOLTAR
function voltar(){
  document.getElementById("chatBox").style.display = "none";
  document.getElementById("home").style.display = "block";
}

// =========================
// SALVAR PERFIL
document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const file = document.getElementById("profilePic").files[0];
  let photo = currentUser.photo;

  if(file){
    const reader = new FileReader();
    reader.onload = async () => {
      photo = reader.result;
      await saveProfile(username, photo);
    }
    reader.readAsDataURL(file);
  } else {
    await saveProfile(username, photo);
  }
});

async function saveProfile(username, photo){
  await fetch("/saveProfile", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ id: currentUser.id, username, photo })
  });

  currentUser.username = username;
  currentUser.photo = photo;

  localStorage.setItem("currentUser", JSON.stringify(currentUser));

  document.getElementById("profilePreview").src = photo;
}

// =========================
// ADICIONAR CONTATO
document.getElementById("addFriendBtn").addEventListener("click", async () => {
  const friendId = document.getElementById("addUserId").value.trim();

  if(!friendId) return alert("Digite o ID");

  const res = await fetch(`/getUser/${friendId}`);
  const user = await res.json();

  if(user.error) return alert("Usuário não encontrado");

  if(!contacts.some(c => c.id === user.id)){
    contacts.push(user);
    localStorage.setItem("contacts", JSON.stringify(contacts));
    renderContacts();
  }

  document.getElementById("addUserId").value = "";
});

// =========================
// ENVIAR
document.getElementById("sendMessageBtn").addEventListener("click", async () => {
  const text = document.getElementById("messageText").value.trim();

  if(!text || !currentChatUser) return;

  const newMsg = {
    fromId: currentUser.id,
    toId: currentChatUser.id,
    text
  };

  await fetch("/sendMessage", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(newMsg)
  });

  addMessageToScreen(newMsg, currentUser);

  document.getElementById("messageText").value = "";
});

// =========================
// CARREGAR MENSAGENS (SEM PISCAR)
async function loadMessages(firstLoad = false){
  if(!currentUser || !currentChatUser) return;

  const res = await fetch(`/getMessages/${currentUser.id}`);
  const msgs = await res.json();

  const filtered = msgs.filter(m =>
    (m.fromId === currentUser.id && m.toId === currentChatUser.id) ||
    (m.fromId === currentChatUser.id && m.toId === currentUser.id)
  );

  if(firstLoad){
    document.getElementById("messages").innerHTML = "";

    for(let m of filtered){
      const user = await getUser(m.fromId);
      addMessageToScreen(m, user);
    }

    lastMessages = filtered;
    return;
  }

  if(filtered.length === lastMessages.length) return;

  const newOnes = filtered.slice(lastMessages.length);

  for(let m of newOnes){
    const user = await getUser(m.fromId);
    addMessageToScreen(m, user);
  }

  lastMessages = filtered;
}

// =========================
// ADICIONAR NA TELA
function addMessageToScreen(m, user){
  const messagesDiv = document.getElementById("messages");

  const isMe = m.fromId === currentUser.id;

  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${isMe ? "me" : "other"}`;

  const img = document.createElement("img");
  img.className = "avatar";

  img.src = user.photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = m.text;

  if (isMe) {
    msgDiv.appendChild(bubble);
    msgDiv.appendChild(img);
  } else {
    msgDiv.appendChild(img);
    msgDiv.appendChild(bubble);
  }

  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// =========================
// PEGAR USUÁRIO
async function getUser(id){
  const res = await fetch(`/getUser/${id}`);
  return await res.json();
}

// =========================
setInterval(loadMessages, 2000);
