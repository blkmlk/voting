import {AvatarGenerator} from "random-avatar-generator";

let generator = new AvatarGenerator();

export function getAvatar(seed) {
    return generator.generateRandomAvatar(seed);
}