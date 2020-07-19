const fs = require('fs-extra');
const { toSystemPath } = require('../core/path');

// simple inital implementation
// IMPROVE: support quoted escapes
// better implementation at:
// https://github.com/adaltas/node-csv-parse
// https://github.com/mafintosh/csv-parser
function parseCSV(csv, options) {
    if (!csv) return [];

    let delimiter = options.delimiter.replace('\\t', '\t');
    let keys = options.fields;
    let data = csv.split(/\r?\n/);

    if (options.header) {
        keys = data.shift().split(delimiter);
    }

    return data.map(line => {
        let value = {}
        let values = line.split(delimiter);

        if (values.length != keys.length) {
            throw new Error('parseCSV: error parsing csv.');
        }

        for (let i = 0; i < values.length; i++) {
            value[keys[i]] = values[i];
        }

        return value;
    });
}

module.exports = {

    csv: async function(options) {
        let path = this.parseRequired(options.path, 'string', 'export.csv: path is required.');
        let fields = this.parseOptional(options.fields, 'object', []);
        let header = this.parseOptional(options.header, 'boolean', false);
        let delimiter = this.parseOptional(options.delimiter, 'string', ',');
        let csv = await fs.readFile(toSystemPath(path));

        return parseCSV(csv, { fields, header, delimiter });
    },

    xml: function(options) {
        // TODO: import.xml
        throw new Error('import.xml: not implemented.');
    },

};