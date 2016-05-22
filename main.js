// var Glob = require("glob");
var path = require('path');
var fs = require("fs");

//TODO assume files are in urf8
//TODO assume file are .sass and not .scss
smartSass(["./src/**/*"],"./dest");



function smartSass(sourcePatterns, targetDirectoryRoot){
    var filesWhichNeedSass = []; //returned value
    var filesWhichNeedSassUniqe = {}; // an object will hold uniqe paths
    var importsMap = {};// an object with : filepath : [dependencies]
    var sourceFiles = []; //an array of all files in sourcePatterns
    var changedPartials = []; //
    var Glob = require("glob").Glob;

    //add all src files to sorceFiles[]
    for (var i = 0, arrLen = sourcePatterns.length; i < arrLen; i++) {
        var mg =  new Glob(sourcePatterns[i]+".sass", {sync:true}, null);
        for (var j = 0, foundLen = mg.found.length; j < foundLen; j++){
            importsMap[mg.found[j]]=[];
        }
        sourceFiles= sourceFiles.concat(mg.found);
    }
    // console.log(importsMap);
    addfilesBeenChanged(sourceFiles,targetDirectoryRoot,changedPartials,filesWhichNeedSass); // add all files where (src.modified>dest.created) to fileWhichNeedSass
    addDependecies(importsMap,sourceFiles); //add add all imports to a map of <filename, [array of dependencied]>
    // console.log(importsMap["./src/1/bla1.sass"]);
    var filesCheckList = makeOrder(importsMap);
    addDepended(filesCheckList,importsMap,filesWhichNeedSass); // concats files already found with the files in importsMap whom are depended in these files

    console.log(filesCheckList);
    // console.log(importsMap[sourceFiles[2]]);
    // console.log(filesWhichNeedSass);
   return filesWhichNeedSass;
}
//TODO check if works on all types of concat of path ("./src" "/src", "C:/" etc.). wait for email from yaniv
function addfilesBeenChanged(sourceFiles, targetDirectoryRoot,changedPartials, filesWhichNeedSass) {


    //for (file in sourceFiles)
    for (var i = 0, len = sourceFiles.length; i < len; i++) {
        var srcStr = sourceFiles[i];
       // var destStr = path.join(targetDirectoryRoot,sourceFiles[i].substr(0,sourceFiles[i].length-4)+"css");
        var destStr = path.join(targetDirectoryRoot,path.dirname(sourceFiles[i]),path.basename(sourceFiles[i],".sass")+".css");
        try {
            var statSrc = fs.statSync(srcStr);
        }
        catch(err){
            //if file is in accessible or was removed during the runtime
            console.log("stat error: " + err);
            sourceFiles.remove("srcStr");
        }
        try {
            var statDest= fs.statSync(destStr);
            //  if (src.modified>dest.created)
            if (statSrc.mtime>statDest.birthtime){

                filesWhichNeedSass.push(srcStr);
            }
        }
        catch(err) {
            //if dest file does not exist then recompile
            console.log("stat error: " + err);
            filesWhichNeedSass.push(srcStr);
        }
    }



}

function addDependecies(importsMap,sourceFiles) {
    for (var i = 0, sourceLen = sourceFiles.length; i < sourceLen; i++) {
        filePath = sourceFiles[i];
        var fileStr = fs.readFileSync(filePath,"utf8");
        // console.log(fileStr);
        if (filePath=="./src/1/bla1.sass"){ fileImports=["./src/2/bla2.sass","./src/3/bla3.sass"];}else{ if (filePath=="./src/2/bla2.sass"){fileImports=["./src/3/bla3.sass"];}else {fileImports=[];}}
        // var fileImports = fileStr.split(/@import|[\s\,\;]+/igm).filter(Boolean); //TODO doesnt work + //TODO join path's of filepath and imports
        for (var j = 0, importsLen = fileImports.length; j < importsLen; j++) {
            importsMap[filePath].push(fileImports[j]);//concat(fileImports);
        }
    }
}

function makeOrder(graph) {
    var sorted  = [], // sorted list of IDs ( returned value )
        visited = {}; // hash: id of already visited node => true

    // 2. topological sort
    Object.keys(graph).forEach(function visit(name, ancestors) {
        if (!Array.isArray(ancestors)) ancestors = [];
        ancestors.push(name);
        visited[name] = true;

        graph[name].forEach(function(dep) {
            if (ancestors.indexOf(dep) >= 0)  // if already in ancestors, a closed chain exists.
                throw new Error('Circular dependency "' +  dep + '" is required by "' + name + '": ' + ancestors.join(' -> '));

            // if already exists, do nothing
            if (visited[dep]) return;
            visit(dep, ancestors.slice(0)); // recursive call
        });

        if(sorted.indexOf(name)<0) sorted.push(name);
    });

    return sorted;
}

function addDepended(filesCheckList,importsMap,filesWhichNeedSass) {
    for (var i = 0, l; i < filesCheckList.length; i++) {
        var importsArr = importsMap[filesCheckList[i]];
        for (var j = 0, l; j < importsArr.length; j++) {
            if (path.basename(importsArr[j]).charAt[0]=='_'){ //if file name begins with '_' => compile
                filesCheckList[i]

            }
        }
    }

}