
//wrraping module by "smartSassCompile"
smartSass = function(sourcePatterns, targetDirectoryRoot) {
    var path = require('path');
    var fs = require("fs");

    //run smartSass
    filesWhichNeedSass = smartSassCompile(sourcePatterns, targetDirectoryRoot);

    //print solution
    console.log(filesWhichNeedSass);

    return filesWhichNeedSass;

    function smartSassCompile(sourcePatterns, targetDirectoryRoot) {
        var Glob = require("glob").Glob;
        var filesWhichNeedSassUniq = {}; // an object which holds unique paths of files need to be recompiled
        var importsMap = {};// a map object with : <filepath : [dependencies]> which represents a graph
        var sourceFiles = []; //an array of all files in sourcePatterns

        //add all src files to sorceFiles[]
        for (var i = 0, arrLen = sourcePatterns.length; i < arrLen; i++) {
            var mg = new Glob(sourcePatterns[i] + ".sass", {sync: true}, null);
            for (var j = 0, foundLen = mg.found.length; j < foundLen; j++) {
                importsMap[path.normalize(mg.found[j])] = [];
                sourceFiles.push(path.normalize(mg.found[j]))
            }
            // sourceFiles= sourceFiles.concat();
        }

        // add all files where (src.modified>dest.created) to fileWhichNeedSass
        addfilesBeenChanged(sourceFiles, targetDirectoryRoot, filesWhichNeedSassUniq);

        //add add all imports to a map of <filename, [array of dependencied]>
        addDependecies(importsMap, sourceFiles);

	
        //sort topologically the order of import checking
        var filesCheckList = makeOrder(importsMap);

        // concats files already found with the files in importsMap whom are depended in these files
        addDepended(filesCheckList, importsMap, filesWhichNeedSassUniq);

        //transfer map to array
        var filesWhichNeedSass = Object.keys(filesWhichNeedSassUniq); //returned value

        //return array
        return filesWhichNeedSass;
    }

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
            var destStr = path.join(targetDirectoryRoot, path.dirname(sourceFiles[i]), path.basename(sourceFiles[i], ".sass") + ".css");
            try {
                var statSrc = fs.statSync(srcStr);
            }
            catch (err) {
                //if file is in accessible or was removed during the runtime
                console.log("stat error on file: " + srcStr + ". error is :" + err);
                sourceFiles.remove("srcStr");
            }
            try {
                var statDest = fs.statSync(destStr);
                if (typeof statSrc.mtime == "undefined"){ throw new Error("\"" + srcStr+ "\""+"modification time does not exist is file system");}
                if (typeof statDest.birthtime== "undefined"){ throw new Error("\"" + destStr+ "\""+"birthtime time does not exist is file system");}
                if (statSrc.mtime > statDest.birthtime) { //  if (src.modified>dest.created)
                    filesWhichNeedSassUniq[srcStr] = 1;// filesWhichNeedSass.push(srcStr);
                }
            }
            catch (err) {
                //if (dest file does not exist) OR (source.mtime or dest.birthtime are undefined in filesystem) then recompile
                filesWhichNeedSassUniq[srcStr] = 1;//filesWhichNeedSass.push(srcStr);
            }
        }

    }

    /*@param
     importsMap -  a map object with : <filepath : [dependencies]> which represents a graph
     sourceFiles - all source files given.

     the function adds for each file in "sourceFiles" all its dependecies in this way: <filename, [array of dependencied]>
     */
    function addDependecies(importsMap, sourceFiles) {
        for (var i = 0, sourceLen = sourceFiles.length; i < sourceLen; i++) {
            filePath = sourceFiles[i];
            var fileStr = fs.readFileSync(filePath, "utf8");
            var fileImports = getImportsArr(fileStr);
            for (var j = 0, importsLen = fileImports.length; j < importsLen; j++) {
                var importedFileFullDir = path.normalize(path.join(path.dirname(filePath), fileImports[j]));
                if (importedFileFullDir in importsMap) {
                    importsMap[filePath].push(importedFileFullDir);//concat(fileImports);
                }
            }
            if (fileImports.length == 0) {
                importsMap[filePath] = [];
            }
        }
    }

    /*str - a file name
    returns an array with str's imported files
     */
    function getImportsArr(str) {
        var re = /(?:@import)\s+([^;]+)/igm
        var arr = [];

        while (result = re.exec(str)) {
            arr = arr.concat(result[1].split(","));
        }
        for (var i = 0, arrLen = arr.length; i < arrLen; i++) {
            arr[i] = arr[i].substring(1, arr[i].length - 1) + ".sass";
        }
        return arr;
    }

    /*@param
     importsMap -  a map object with : <filepath : [dependencies]> which represents a graph
     each filePath is vertex
     each file in [dependencies] is a an esdge

     the function returns a topological sort of the graph represents a "way" if checking dependecies
     **NOTE - the duntion throws an exception if theres a cycle (there's no way of compiling successfuly)**
     */
    function makeOrder(importsMap) {
        var sorted = [], // sorted list of IDs ( returned value )
            visited = {}; // hash: id of already visited node => true

        // 2. topological sort
        Object.keys(importsMap).forEach(function visit(name, ancestors) {
            if (!Array.isArray(ancestors)) ancestors = [];
            ancestors.push(name);
            visited[name] = true;
            importsMap[name].forEach(function (dep) {
                if (ancestors.indexOf(dep) >= 0)  // if already in ancestors, a closed chain exists.
                    throw new Error('Circular dependency "' + dep + '" is required by "' + name + '": ' + ancestors.join(' -> '));

                // if already exists, do nothing
                if (visited[dep]) return;
                visit(dep, ancestors.slice(0)); // recursive call
            });
            if (sorted.indexOf(name) < 0) sorted.push(name);
        });

        return sorted;
    }

    /*@param
     filesCheckList - a topologiacal sort of importsMap
     importsMap -  a map object with : <filepath : [dependencies]> which represents a graph
     filesWhichNeedSassUniq - an object which holds unique paths of files need to be recompiled

     the function goes over "importsMap" by its topological sort "filesCheckList" and adds to "filesWhichNeedSassUniq" each file which is dependent on a file whom about to recompile
     */
    function addDepended(filesCheckList, importsMap, filesWhichNeedSassUniq) {
        for (var i = 0, l; i < filesCheckList.length; i++) {
            var importsArr = importsMap[filesCheckList[i]];
            for (var j = 0, l; j < importsArr.length; j++) {
                var filePath = importsArr[j];
                if (path.basename(filePath).charAt[0] == '_') { //if file name begins with '_' => compile file
                    filesWhichNeedSassUniq[filesCheckList[i]] = 1;
                } else {
                    if (filePath in filesWhichNeedSassUniq) {// if a dependency needs to rebuild = > compile file
                        filesWhichNeedSassUniq[filesCheckList[i]] = 1;
                    }
                }

            }
        }

    }

}
