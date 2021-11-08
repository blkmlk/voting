import {AvatarGenerator} from "random-avatar-generator";

let generator = new AvatarGenerator();

export function getAvatar(seed) {
    return generator.generateRandomAvatar(seed);
}

export function getRemainingTime(expiresAt, now) {
    let secondsLeft = expiresAt - now;
    let hours = Math.floor(secondsLeft/(60*60));
    let minutes = Math.floor(secondsLeft/60) - hours*60;
    let seconds = secondsLeft % 60;
    return zeroPad(hours, 2) + ":" + zeroPad(minutes, 2) + ":" + zeroPad(seconds, 2);
}

function zeroPad (num, places) {
    return String(num).padStart(places, '0');
}
