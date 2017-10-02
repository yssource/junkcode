var fs = require('fs');
var shell = require('shelljs');
const path = require('path');

// Default rule
var rule = {
    ignorePattern: [],
    pathReplace: [
        {
            find: "",
            replace: ""
        }
    ],
    fileReplace: [
        {
            "pattern": ".*",
            "find": "\\\\",
            "replace": "\\\\"
        }
    ]
}


if (process.argv.length !== 4) {
    console.log("node generator.js input output");
    return -1;
}

var input = path.resolve(process.argv[2]);
var output = path.resolve(process.argv[3]);

var ruleFile = input + "/rule.json";

if (!shell.test("-f", ruleFile ) ){
    console.log("Rule file not found: " + ruleFile);
    console.log("Create a default rule file");
    var content = shell.ShellString(JSON.stringify(rule,null,4));
    content.toEnd(ruleFile);
}

rule = JSON.parse(shell.cat(ruleFile));

var files = shell.find(input).filter(function(file) {
    var name = path.basename(file);
    return !shell.test("-d", file) && name !== "rule.json";
});

var generators = [];
var basePath = path.resolve(input) + "/";

var files = files.filter(function(file){

    var source = file.replace(basePath, "");

    return rule.ignorePattern.reduce(function(acc, value) {
        var res = source.match(value);
        if (res) {
            acc.include = false;
        }
        return acc;
    }, { include: true} ).include;
}).map(function(file) {

    var source = file.replace(basePath, "");

    var target = rule.pathReplace.reduce(function(acc, value) {
        return acc.replace(new RegExp(value.find, "g"), value.replace);
    }, source);

    var content = shell.cat(file);

    var newContent = rule.fileReplace.reduce(function(acc,value) {
        return acc.replace(new RegExp(value.find, "g"), value.replace);
    }, content);

    var outputFile = path.resolve(output, source);

    var dirname = path.dirname(outputFile);

    shell.mkdir("-p", dirname);

    shell.ShellString(newContent).to(outputFile);

    var res = {
        source: source,
        target: target
    }

    if (source.match(/pro$/)) {
        res.openAsProject = true;
    }

    return res;
});

var wizardFilePath = path.resolve(output, "wizard.json");
var content = shell.cat(wizardFilePath);
var wizard = JSON.parse(content);

wizard.generators = [
    {
        typeId: "File",
        "data": files
    }
];

shell.ShellString(JSON.stringify(wizard,null,4)).to(wizardFilePath);