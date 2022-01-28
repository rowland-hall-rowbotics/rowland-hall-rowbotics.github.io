async function loading_animation() {
    let i = 1;
    let please_wait = $("#please-wait");

    reset_please_wait(please_wait);

    while (true) {
        await new Promise(r => setTimeout(r, 1000));
        please_wait.html(please_wait.html() + ".")

        if (i == 3) { i = 0; reset_please_wait(please_wait); }
        i++;
    }
}

function reset_please_wait(please_wait) {
    please_wait.html("Please wait, the results are coming in.");
}