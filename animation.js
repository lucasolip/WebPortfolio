let scrollChange = function () {
    let currentScrollPosition = window.pageYOffset;
    if (currentScrollPosition < 5) {
        document.getElementById("nameTitle").classList.remove("hidden");
        document.getElementById("nameTitle").classList.add("visible");
        document.getElementById("pauseButton").classList.remove("hidden");
        document.getElementById("pauseButton").classList.add("visible");
        document.getElementById("topButton").classList.add("hidden");
        document.getElementById("topButton").classList.remove("visible");
    } else {
        document.getElementById("nameTitle").classList.remove("visible");
        document.getElementById("nameTitle").classList.add("hidden");
        document.getElementById("pauseButton").classList.remove("visible");
        document.getElementById("pauseButton").classList.add("hidden");
        document.getElementById("topButton").classList.remove("hidden");
        document.getElementById("topButton").classList.add("visible");
    }
}
scrollChange();
window.onscroll = scrollChange;

let projectCards = document.querySelectorAll('.projectCard');

projectCards.forEach((card) => {
    card.onclick = function () {
        if (card.classList.contains("projectCardFlip")) {
            card.classList.remove("projectCardFlip");
        } else {
            card.classList.add("projectCardFlip");
        }
    }
});