var Glob = require("glob");

smartSass("./threads/**","./");




function smartSass(sourcePatterns, targetDirectoryRoot){
    var filesWhichNeedSass = [];
    var sourceFiles = [];
    var importsMap = [];

    var mg = new Glob(sourcePatterns, {}, function (er, sourceFiles) { //add all src files to sorceFiles[]
        console.log("matches:", sourceFiles)
    });
    addfilesBeenChanged(sourcePatterns,targetDirectoryRoot,filesWhichNeedSass); // add all files where (src.modified>dest.created) to fileWhichNeedSass
    // importsMap = addDependecies(); //add add all imports to map<file,(importsArr)>
    // filesWhichNeedSass=addDepended(importsMap,filesWhichNeedSass); // concats files already found with file in map whom are depended in other files

   return filesWhichNeedSass;
}

function addfilesBeenChanged(sourcePatterns, targetDirectoryRoot, filesWhichNeedSass) {
    var fs = require("fs");
    function getDate (file, cb) {
        fs.stat(file, function(err,stats){
            if(err) return cb(err);
            cb(null, stats.ctime);
        })
    }
    //for (file in sourcePatterns)
getDate('main.js', function(err, Date) {
    if(err) {
        console.log(err);
        return;
    }
    console.log('The ctime of the file is ' + Date);
});

}