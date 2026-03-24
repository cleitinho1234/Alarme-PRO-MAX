const luffy = document.getElementById("luffy");

let x = 50;
let y = 100;

let teclas = {};

document.addEventListener("keydown", (e) => {
teclas[e.key] = true;
});

document.addEventListener("keyup", (e) => {
teclas[e.key] = false;
});

function loop() {

```
if (teclas["ArrowRight"]) {
    x += 5;
}

if (teclas["ArrowLeft"]) {
    x -= 5;
}

if (teclas["ArrowUp"]) {
    y -= 5;
}

if (teclas["ArrowDown"]) {
    y += 5;
}

luffy.style.left = x + "px";
luffy.style.top = y + "px";

requestAnimationFrame(loop);
```

}

loop();
