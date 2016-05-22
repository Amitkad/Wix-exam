
var path = require('path');
var fs = require("fs");

//TODO assume files are in urf8
//TODO assume file are .sass and not .scss
//TODO wrap final and print solution to log file
smartSass(["./src/**/*"],"./dest");



function smartSass(sourcePatterns, targetDirectoryRoot){
    var Glob = require("glob").Glob;
    var filesWhichNeedSassUniq = {}; // an object which holds unique paths of files need to be recompiled
    var importsMap = {};// a map object with : <filepath : [dependencies]> which represents a graph
    var sourceFiles = []; //an array of all files in sourcePatterns

    //add all src files to sorceFiles[]
    for (var i = 0, arrLen = sourcePatterns.length; i < arrLen; i++) {
        var mg =  new Glob(sourcePatterns[i]+".sass", {sync:true}, null);
        for (var j = 0, foundLen = mg.found.length; j < foundLen; j++){
            importsMap[mg.found[j]]=[];
        }
        sourceFiles= sourceFiles.concat(mg.found);
    }

    // add all files where (src.modified>dest.created) to fileWhichNeedSass
    addfilesBeenChanged(sourceFiles,targetDirectoryRoot,filesWhichNeedSassUniq);

    //add add all imports to a map of <filename, [array of dependencied]>
    addDependecies(importsMap,sourceFiles);

    //sort topologically the order of import checking
    var filesCheckList = makeOrder(importsMap);

    // concats files already found with the files in importsMap whom are depended in these files
    addDepended(filesCheckList,importsMap,filesWhichNeedSassUniq);

    //transfer map to array
    var filesWhichNeedSass = Object.keys(filesWhichNeedSassUniq); //returned value

    console.log(filesWhichNeedSass);

    //return array
   return filesWhichNeedSass;
}
//TODO check if works on all types of concat of path ("./src" "/src", "C:/" etc.). wait for email from yaniv

/*@param
    sourceFiles - all source files given.
    targetDirectoryRoot - the root folder of file's target folders
    filesWhichNeedSassUniq -  an object which holds unique paths of files need to be recompiled

the function for each file in "sourceFiles" if (src.modified>dest.created) then add to fileWhichNeedSass
 */
function addfilesBeenChanged(sourceFiles, targetDirectoryRoot, filesWhichNeedSassUniq) {
    //for (file in sourceFiles)
    for (var i = 0, len = sourceFiles.length; i < len; i++) {
        var srcStr = sourceFiles[i];
        var destStr = path.join(targetDirectoryRoot,path.dirname(sourceFiles[i]),path.basename(sourceFiles[i],".sass")+".css");
        try {
            var statSrc = fs.statSync(srcStr);
        }
        catch(err){
            //if file is in accessible or was removed during the runtime
            console.log("stat error on file: " +srcStr + ". error is :" + err);
            sourceFiles.remove("srcStr");
        }
        try {
            var statDest= fs.statSync(destStr);
            if (statSrc.mtime>statDest.birthtime){ //  if (src.modified>dest.created)
                filesWhichNeedSassUniq[srcStr]=1;// filesWhichNeedSass.push(srcStr);
            }
        }
        catch(err) {
            //if dest file does not exist then recompile
            filesWhichNeedSassUniq[srcStr]=1;//filesWhichNeedSass.push(srcStr);
        }
    }

}

/*@param
 importsMap -  a map object with : <filepath : [dependencies]> which represents a graph
 sourceFiles - all source files given.

 the function adds for each file in "sourceFiles" all its dependecies in this way: <filename, [array of dependencied]>
 */
function addDependecies(importsMap,sourceFiles) {
    for (var i = 0, sourceLen = sourceFiles.length; i < sourceLen; i++) {
        filePath = sourceFiles[i];
        var fileStr = fs.readFileSync(filePath,"utf8");
        if (filePath=="./src/1/bla1.sass"){ fileImports=["./src/2/bla2.sass","./src/3/bla3.sass"];}else{ if (filePath=="./src/2/bla2.sass"){fileImports=["./src/3/bla3.sass"];}else {fileImports=[];}}//TODO
        // var fileImports = fileStr.split(/@import|[\s\,\;]+/igm).filter(Boolean); //TODO doesnt work + //TODO join path's of filepath and imports
        for (var j = 0, importsLen = fileImports.length; j < importsLen; j++) {
            importsMap[filePath].push(fileImports[j]);//concat(fileImports);
        }
        if (fileImports.length==0){
            importsMap[filePath]=[];
        }
    }
}

/*@param
    importsMap -  a map object with : <filepath : [dependencies]> which represents a graph
                    each filePath is vertex
                    each file in [dependencies] is a an esdge

 the function returns a topological sort of the graph represents a "way" if checking dependecies
 **NOTE - the duntion throws an exception if theres a cycle (there's no way of compiling successfuly)**
 */
function makeOrder(importsMap) {
    var sorted  = [], // sorted list of IDs ( returned value )
        visited = {}; // hash: id of already visited node => true

    // 2. topological sort
    Object.keys(importsMap).forEach(function visit(name, ancestors) {
        if (!Array.isArray(ancestors)) ancestors = [];
        ancestors.push(name);
        visited[name] = true;

        importsMap[name].forEach(function(dep) {
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

/*@param
 filesCheckList - a topologiacal sort of importsMap
 importsMap -  a map object with : <filepath : [dependencies]> which represents a graph
 filesWhichNeedSassUniq - an object which holds unique paths of files need to be recompiled

 the function goes over "importsMap" by its topological sort "filesCheckList" and adds to "filesWhichNeedSassUniq" each file which is dependent on a file whom about to recompile
 */
function addDepended(filesCheckList,importsMap,filesWhichNeedSassUniq) {
    for (var i = 0, l; i < filesCheckList.length; i++) {
        var importsArr = importsMap[filesCheckList[i]];
        for (var j = 0, l; j < importsArr.length; j++) {
            var filePath = importsArr[j];
            if (path.basename(filePath).charAt[0]=='_'){ //if file name begins with '_' => compile file
                filesWhichNeedSassUniq[filesCheckList[i]]=1;
            }else{
                if (filePath in filesWhichNeedSassUniq){// if a dependency needs to rebuild = > compile file
                    filesWhichNeedSassUniq[filesCheckList[i]]=1;
                }
            }

        }
    }

}