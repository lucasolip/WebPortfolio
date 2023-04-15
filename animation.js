window.onscroll = function () {
    let currentScrollPosition = window.pageYOffset;
    if (currentScrollPosition < 5) {
        document.getElementById("nameTitle").classList.remove("hidden");
        document.getElementById("nameTitle").classList.add("visible");
        document.getElementById("topButton").classList.add("hidden");
        document.getElementById("topButton").classList.remove("visible");
    } else {
        document.getElementById("nameTitle").classList.remove("visible");
        document.getElementById("nameTitle").classList.add("hidden");
        document.getElementById("topButton").classList.remove("hidden");
        document.getElementById("topButton").classList.add("visible");
    }
}