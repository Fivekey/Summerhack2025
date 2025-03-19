
//image storage engine

const multer = require('multer');

const storage = multer.diskStorage({
    destination: './upload/images/',
    //different from video
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({storage:storage});
module.exports = {
    upload: upload
}