const fs = require('fs-extra');
const debug = require('debug')('server-connect:image');
const { basename, join } = require('path');
const { toAppPath, toSystemPath, parseTemplate, getUniqFile } = require('../core/path');

// TODO support positioning with left/top/right/bottom
module.exports = {

    getImageSize: async function(options) {
        let path = toSystemPath(this.parseRequired(options.path, 'string', 'image.getImageSize: path is required.'));

        const sharp = require('sharp');
        const image = sharp(path);
        const metadata = await image.metadata();

        return {
            width: metadata.width,
            height: metadata.height
        };
    },

    load: async function(options, name) {
        let path = toSystemPath(this.parseRequired(options.path, 'string', 'image.load: path is required.'));
        let orient = this.parseOptional(options.autoOrient, 'boolean', false);

        const sharp = require('sharp');
        const image = sharp(path);
        const metadata = await image.metadata();

        if (orient) image.rotate();

        this.image = this.image || {};
        this.image[name] = { name: basename(path), image, metadata };

        return {
            name: basename(path),
            width: metadata.width,
            height: metadata.height
        };
    },

    save: async function(options) {
        const sharp = this.image[options.instance];
        if (!sharp) throw new Error(`image.save: instance "${options.instance} doesn't exist.`);
        
        let path = toSystemPath(this.parseRequired(options.path, 'string', 'image.save: path is required.'));
        let format = this.parseOptional(options.format, 'string', '').toLowerCase();
        let template = this.parseOptional(options.template, 'string', '{name}{ext}');
        let overwrite = this.parseOptional(options.overwrite, 'boolean', false);
        let createPath = this.parseOptional(options.createPath, 'boolean', true);
        let quality = this.parseOptional(options.quality, 'number', 75);

        if (format == 'jpg') format = 'jpeg';

        if (!fs.existsSync(path)) {
            if (createPath) {
                await fs.ensureDir(path);
            } else {
                throw new Error(`image.save: path "${path}" doesn't exist.`);
            }
        }

        let file = join(path, sharp.name);

        if (template) {
            file = parseTemplate(file, template);
        }

        const data = await sharp.image.toBuffer();

        if (fs.existsSync(file)) {
            if (overwrite) {
                await fs.unlink(file);
            } else {
                file = getUniqFile(file);
            }
        }

        if (format) {
            sharp.image.toFormat(format, { quality });
        }

        await fs.writeFile(file, data) //.toFile(file);

        return toAppPath(file);
    },

    resize: async function(options) {
        const sharp = this.image[options.instance];
        if (!sharp) throw new Error(`image.resize: instance "${options.instance} doesn't exist.`);

        let width = this.parseOptional(options.width, 'number', null);
        let height = this.parseOptional(options.height, 'number', null);
        let upscale = this.parseOptional(options.upscale, 'boolean', false);

        sharp.image.resize(width, height, { fit: width && height ? 'fill' : 'inside', withoutEnlargement: !upscale });
    },

    crop: async function(options) {
        const sharp = this.image[options.instance];
        if (!sharp) throw new Error(`image.crop: instance "${options.instance} doesn't exist.`);

        let left = this.parseRequired(options.x, 'number', 'image.crop: x is required.');
        let top = this.parseRequired(options.y, 'number', 'image.crop: y is required.');
        let width = this.parseRequired(options.width, 'number', 'image.crop: width is required.');
        let height = this.parseRequired(options.height, 'number', 'image.crop: height is required.');

        sharp.image.extract({ left, top, width, height });
    },

    watermark: async function(options) {
        const sharp = this.image[options.instance];
        if (!sharp) throw new Error(`image.watermark: instance "${options.instance} doesn't exist.`);

        let left = this.parseRequired(options.x, 'number', 'image.watermark: x is required.');
        let top = this.parseRequired(options.y, 'number', 'image.watermark: y is required.');
        let input = toSystemPath(this.parseRequired(options.path, 'string', 'image.watermark: path is required.'));

        sharp.image.composite([{ input, left, top }]);
    },

    text: async function(options) {
        // NOTE Add text to image is not supported by Sharp
        throw new Error('image.text: not supported');
    },

    tiled: async function(options) {
        const sharp = this.image[options.instance];
        if (!sharp) throw new Error(`image.tiled: instance "${options.instance} doesn't exist.`);

        let input = toSystemPath(this.parseRequired(options.path, 'string', 'image.tiled: path is required.'));
        let padding = this.parseOptional(options.padding, 'number', 0);

        if (padding) {
            input = await require('sharp')(input).extend({
                top: padding, left: padding, bottom: 0, right: 0, background: { r:0, g: 0, b: 0, alpha: 0 }
            }).toBuffer();
        }

        sharp.image.composite([{ input, left: 0, top: 0, tile: true }]);
    },

    flip: async function(options) {
        const sharp = this.image[options.instance];
        if (!sharp) throw new Error(`image.flip: instance "${options.instance} doesn't exist.`);

        let horizontal = this.parseOptional(options.horizontal, 'boolean', false);
        let vertical = this.parseOptional(options.vertical, 'boolean', false);

        if (horizontal) sharp.image.flop();
        if (vertical) sharp.image.flip();
    },

    rotateLeft: async function(options) {
        const sharp = this.image[options.instance];
        if (!sharp) throw new Error(`image.rotateLeft: instance "${options.instance} doesn't exist.`);

        sharp.image.rotate(-90);
    },

    rotateRight: async function(options) {
        const sharp = this.image[options.instance];
        if (!sharp) throw new Error(`image.rotateRight: instance "${options.instance} doesn't exist.`);

        sharp.image.rotate(90);
    },

    smooth: async function(options) {
        const sharp = this.image[options.instance];
        if (!sharp) throw new Error(`image.smooth: instance "${options.instance} doesn't exist.`);

        sharp.image.convolve({
            width: 3,
            height: 3,
            kernel: [
                1, 1, 1,
                1, 1, 1,
                1, 1, 1
            ]
        });
    },

    blur: async function(options) {
        const sharp = this.image[options.instance];
        if (!sharp) throw new Error(`image.blur: instance "${options.instance} doesn't exist.`);

        sharp.image.convolve({
            width: 3,
            height: 3,
            kernel: [
                1, 2, 1,
                2, 4, 2,
                1, 2, 1
            ]
        });
    },

    sharpen: async function(options) {
        const sharp = this.image[options.instance];
        if (!sharp) throw new Error(`image.sharpen: instance "${options.instance} doesn't exist.`);

        sharp.image.convolve({
            width: 3,
            height: 3,
            kernel: [
                 0, -2,  0,
                -2, 15, -2,
                 0, -2,  0
            ]
        });
    },

    meanRemoval: async function(options) {
        const sharp = this.image[options.instance];
        if (!sharp) throw new Error(`image.meanRemoval: instance "${options.instance} doesn't exist.`);

        sharp.image.convolve({
            width: 3,
            height: 3,
            kernel: [
                -1, -1, -1,
                -1,  9, -1,
                -1, -1, -1
            ]
        });
    },

    emboss: async function(options) {
        const sharp = this.image[options.instance];
        if (!sharp) throw new Error(`image.emboss: instance "${options.instance} doesn't exist.`);

        sharp.image.convolve({
            width: 3,
            height: 3,
            kernel: [
                -1, 0, -1,
                 0, 4,  0,
                -1, 0, -1
            ],
            offset: 127
        });
    },

    edgeDetect: async function(options) {
        const sharp = this.image[options.instance];
        if (!sharp) throw new Error(`image.edgeDetect: instance "${options.instance} doesn't exist.`);

        sharp.image.convolve({
            width: 3,
            height: 3,
            kernel: [
                -1, -1, -1,
                 0,  0,  0,
                 1,  1,  1
            ],
            offset: 127
        });
    },

    grayscale: async function(options) {
        const sharp = this.image[options.instance];
        if (!sharp) throw new Error(`image.grayscale: instance "${options.instance} doesn't exist.`);

        sharp.image.grayscale();
    },

    sepia: async function(options) {
        const sharp = this.image[options.instance];
        if (!sharp) throw new Error(`image.sepia: instance "${options.instance} doesn't exist.`);

        sharp.image.tint({ r: 112, g: 66, b: 20 });
    },

    invert: async function(options) {
        const sharp = this.image[options.instance];
        if (!sharp) throw new Error(`image.invert: instance "${options.instance} doesn't exist.`);

        sharp.image.negate();
    },

};