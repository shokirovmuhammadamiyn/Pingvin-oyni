"use strict";

/*
  TANK ARENA
  MAIN.JS

  Bu fayl sahifaning boshlang‘ich sozlamalarini boshqaradi.
  Asosiy o‘yin kodi game.js ichida.
*/

document.addEventListener("DOMContentLoaded", () => {

  // Mobil brauzerda uzun bosib turish menyusini o‘chiradi
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });


  // Double-tap zoomni kamaytirish
  let lastTouchEnd = 0;

  document.addEventListener(
    "touchend",
    (e) => {

      const now = Date.now();

      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }

      lastTouchEnd = now;

    },
    {
      passive: false
    }
  );


  // Tugmalar bosilganda brauzerning standart
  // tanlash/drag qilish effektlarini kamaytirish
  document.querySelectorAll("button").forEach((button) => {

    button.addEventListener(
      "dragstart",
      (e) => {
        e.preventDefault();
      }
    );

  });


  // Canvas mavjudligini tekshirish
  const canvas = document.getElementById("gameCanvas");

  if (!canvas) {
    console.error(
      "Tank Arena: gameCanvas topilmadi."
    );

    return;
  }


  // Sahifa tayyor
  document.body.classList.add("app-ready");

});