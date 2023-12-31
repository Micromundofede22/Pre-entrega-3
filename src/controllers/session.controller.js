import { signedCookie } from "cookie-parser";
import config from "../config/config.js";
import UserDTO from "../dto/Users.DTO.js";
import { UserPasswordService, UserService } from "../services/services.js";
import { createHash, generateRandomString, isValidPassword } from "../utils.js";
import nodemailer from "nodemailer";//mail


//variable de entorno en carpeta config, archivo config
const JWT_COOKIE_NAME = config.cookieNameJWT
const JWT_PRIVATE_KEY = config.keyPrivateJWT
// mail
const nodemailerUSER = config.nodemailerUSER
const nodemailerPASS = config.nodemailerPASS

export const postLogin = async (req, res) => {
    res.cookie(JWT_COOKIE_NAME, req.user.token, signedCookie(JWT_PRIVATE_KEY)).redirect('/products/views') //en la cookie guardo el token. signedcockie es la cookie firmada
}

export const getFailLogin = (req, res) => {
    res.send({ error: 'Failed Login!' })
}

export const postRegister = async (req, res) => {
    res.redirect('/session/login') //si registra con middleware passport de routes, redirije al login
}

export const getVerifyUser= async(req,res)=>{
    try{
        const user= await UserService.getUserEmail({email: req.params.user})
        
        if(!user){
            return res.status(400).json({status: "error", error: "El usuario no esta registrado en nuestra base de datos. Registrese primero"})
        }
        const userVerified= await UserService.updateUser(user._id, {status: "VERIFIED"})

        return res.render("sessions/userVerified", {userVerified})

    }catch(err){
        res.status(400).json({status: "error", error: err.message})
    }

}

export const getFailRegister = (req, res) => {
    res.send({ error: 'Failed register!' })            //ruta de fail
}

export const getGitHub = async (req, res) => { }

export const gitHubCallback = async (req, res) => {
    // console.log('Callback: ', req.user)
    res.cookie(JWT_COOKIE_NAME, req.user.token, signedCookie(JWT_PRIVATE_KEY)).redirect('/products/views') //a la coockie le meto el token que esta dentro del user
}

export const getGoogle = async (req, res) => { }

export const googleCallback = async (req, res) => {
    // console.log('Callback: ', req.user)
    res.cookie(JWT_COOKIE_NAME, req.user.token, signedCookie(JWT_PRIVATE_KEY)).redirect('/products/views') //a la cookie le meto el token
}

export const getLogout = (req, res) => {
    req.session.destroy(err => { }) //destruye la session que usa passport en su configuracion
    res.clearCookie(JWT_COOKIE_NAME).redirect("/")//elimino cookie que tiene el token
}

export const getCurrent = (req, res) => {
    const user = new UserDTO(req.user)
    if (!req.user) return res.status(401).json({ status: "error", error: "Sesión no detectada, inicia sesión" })
    // res.status(200).json({ status: "success", payload: new UserDTO(req.user)})
    res.render("perfilUser", { user })
}

export const cargaImage = async (req, res) => {
    try {
        const id = req.user.user._id
        const data = req.file
        // console.log(id)
        console.log(data.filename)

        const result = await UserService.updateUser(id, { file: data.filename })
        // console.log(result)

        if (result === null) {
            res.status(404).json({ status: "error", error: "Not found" })
        } else {
            // res.status(200).json({ status: "success", payload: result })
            res.redirect("/api/session/current/")
        }
    } catch (err) {
        res.status(404).json({ status: "error", message: err.message })
    }
}


export const postOlvidar = async (req, res) => {
    const email = req.body.email
    const user = await UserService.getUserEmail({ email })
    // console.log(user)
    if (!user) {
        res.status(404).json({ status: "error", error: "Usuario no registrado" })
    }
    const token = generateRandomString(16)
    await UserPasswordService.create({ email, token })

    //config email
    let configNodemailer = {
        service: "gmail",
        auth: {
            user: nodemailerUSER,
            pass: nodemailerPASS
        }
    }
    let transporter = nodemailer.createTransport(configNodemailer)

    let message = {
        from: nodemailerUSER,
        to: email,
        subject: "Restablecer contraseña ",
        html: `<h1>Restablece tu contraseña</h1><hr /> Haz click en el siguiente enlace:
          <a href="http://localhost:8080/api/session/verify-token/${token}">Click Aquí</a>`
    }
    try {
        await transporter.sendMail(message)
        res.status(200).json({
            status: "success", message:
                `El link para reestablecer la contraseña fue enviado al mail ${email}. Caduca en 1 hora.`
        })
    } catch (err) {
        res.status(400).json({ status: "error", error: err.message })
    }
}


export const verifyToken = async (req, res) => {
    try {
        const userPassword = await UserPasswordService.getUserPassword({ token: req.params.token })
        if (!userPassword) {
            //si no pongo return, y hago varios clicks en el link del email, revienta y dice 'ERR_HTTP_HEADERS_SENT', ya que envia multiples encabezados
            // return res.status(400).json({ status: "error", error: "Token no válido // Token expiró" })
            return res.render("sessions/olvidarContra") //si el token expiró, me redirije a la vista de volver a mandar el correo con el token
        }
        const user = userPassword.email
        res.render("sessions/resetContra", { user })
    } catch (err) {
        res.status(400).json({ status: "error", error: err.message })
    }
}

export const restablecerContra = async (req, res) => {
    const newPassword = req.body.newPassword
    // console.log(newPassword)
    try {
        const user = await UserService.getUserEmail({ email: req.params.user })                  //busco un usuario por su email
        //    console.log(user.password)

        if (isValidPassword(user, newPassword)) { //isValidPassword viene de utils
            res.status(400).json({ status: "error", error: "Las contraseñas no pueden ser iguales" })
        } else {
            await UserService.updateUser(user._id, { password: createHash(newPassword) })
            res.status(200).json({ status: "success", message: "Contraseña creada con éxito" })
            await UserPasswordService.delete({ email: req.params.user })
        }
    } catch (err) {
        res.status(400).json({ status: "error", error: err.message })
    }
}