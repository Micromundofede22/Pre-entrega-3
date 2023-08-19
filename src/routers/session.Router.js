import { Router } from "express";
import passport from "passport";
import { uploader } from "../middleware/multer.js";
import { signedCookie } from "cookie-parser";
import config from "../config/config.js";

//variable de entorno
const JWT_COOKIE_NAME= config.cookieNameJWT

const router = Router()

// Vista de Login
router.get('/', (req, res) => {
    res.render('sessions/login')
})


// API para login
router.post('/login', passport.authenticate('loginPass', { failureRedirect: '/failLogin' }),
    async (req, res) => {
        res.cookie(JWT_COOKIE_NAME, req.user.token, signedCookie("clavesecreta")).redirect('/views/products') //en la cookie guardo el token
    }
)

router.get('/failLogin', (req, res) => {
    res.send({ error: 'Failed Login!' })
})



//Vista para registrar usuarios
router.get('/register', (req, res) => {
    res.render('sessions/register')
})


// API para crear usuarios en la DB
router.post('/register',
        uploader.single("file")//uploader.single("file") es el middleware de multer para subir fotos. "file, porque en el formulario el name es file"
, 
    passport.authenticate('registerPass', { 
        failureRedirect: '/failRegister' //si no registra, que redirija a fail 
    }), async (req, res) => {
        res.redirect('/') //si registra, redirije al login
    })

router.get('/failRegister', (req, res) => {
    res.send({ error: 'Faileed!' })            //ruta de fail
})

// ruta que conecta hacia git
router.get("/github",
    passport.authenticate("github", { scope: ["user:email"] }),
    async (req, res) => { }
)

// ruta donde git manda json
router.get('/githubcallback',
    passport.authenticate('github', { failureRedirect: '/' }),
    async (req, res) => {
        // console.log('Callback: ', req.user)
        res.cookie(JWT_COOKIE_NAME, req.user.token).redirect('/views/products')
    }
)

router.get("/google",
    passport.authenticate("googlePass", {
        scope: [
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile"
        ],
        session: false
    }),
    async (req, res) => { }
)

router.get("/googlecallback",
    passport.authenticate("googlePass", { failureRedirect: '/' }),
    async (req, res) => {
        // console.log('Callback: ', req.user)
        res.cookie(JWT_COOKIE_NAME, req.user.token).redirect('/views/products')
    })


//datos cliente
router.get("/current", (req, res) => {
    if (!req.user) return res.status(401).json({ status: "error", error: "Sesión no detectada, inicia sesión" })
    res.status(200).json({ status: "success", payload: req.user })
})

// Cerrar Session
router.get('/logout', (req, res) => {
    res.clearCookie(JWT_COOKIE_NAME).redirect("/")
})



export default router