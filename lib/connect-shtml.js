module.exports = function shtmlEmulator(rootDir) {

    return function(req, res, next) {
        var Buffer = require('buffer').Buffer;
        var WritableStream = require("stream-buffers").WritableStreamBuffer;
        var fs = require('fs');
        var path = require('path');

        if(req.url != "/" && !req.url.match(/\.html$/))
            return next();

        var buffer = new WritableStream();

        var oldWrite = res.write;
        res.write = function(chunk) {
            buffer.write(chunk);
            return true;
        };

        var oldEnd = res.end;
        res.end = function(data) {
            if(data) {
                buffer.write(data);
            }

            if (!buffer.size()) {
                return oldEnd.call(this, buffer.getContents());
            }

            var body = buffer.getContentsAsString();
            var includes = body.match(/<!-- #include file=\".+\" -->/g);
            var remaining = includes.length;

            for(var i = 0; i < includes.length; i++) {
                var include = includes[i];
                var file = path.join(rootDir, include.match(/<!-- #include file=\"(.+)\" -->/)[1]);
                grunt.log.writeln("Including " + file);
                fs.readFile(file, 'utf8', function(err, data) {
                    if(err) {
                        grunt.log.writeln(err);
                    }
                    else {
                        body = body.replace(include, data);
                    }

                    if (!--remaining) {
                        oldEnd.call(this, body);
                    }
                });
            }
        }

        next();
    }
}
