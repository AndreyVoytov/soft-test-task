import { Sprite, Texture } from 'pixi.js';
import { Utils } from '../utils/Utils';

export class CustomSprite extends Sprite {
    constructor(image:string) {
        super(Texture.from(Utils.assetPathToUrl(image)));
    }
}