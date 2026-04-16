import React, { useState, useEffect } from 'react';
import { decodeToken } from 'react-jwt';
import Cookies from 'js-cookie';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';

const GoogleLogin = ({ setIsLogin, setUserInfo }) => {
  const navigate = useNavigate();
  const [showLoginButton, setShowLoginButton] = useState(true);

  const handleCredentialResponse = async (response) => {
    const data_decode = decodeToken(response.credential);

    try {
      const permisosResponse = await axios.post('https://planeacion-server.vercel.app/getData', {
        sheetName: 'Permisos'
      });

      console.log('permisosResponse:', permisosResponse);

      if (!Array.isArray(permisosResponse.data.data)) {
        throw new Error('La respuesta no es un array');
      }

      const userPermission = permisosResponse.data.data.find(item => item.user === data_decode.email);

      if (userPermission) {
        const userName = data_decode.email.split('@')[0].split('.')[0];
        const userInfo = {
          name: userName.charAt(0).toUpperCase() + userName.slice(1),
          permission: userPermission.permiso
        };
        setIsLogin(true);
        setUserInfo(userInfo);
        const expiracion = new Date();
        expiracion.setDate(expiracion.getDate() + 5);
        Cookies.set('token', JSON.stringify(data_decode), { expires: expiracion });
        sessionStorage.setItem('logged', JSON.stringify(userPermission));
        setShowLoginButton(false);
      } else {
        alert('No tienes permiso para acceder');
        setIsLogin(false);
      }
    } catch (error) {
      console.error('Error en la solicitud:', error);
      throw error;
    }
  };

  const _get_auth = async () => {
    try {
      google.accounts.id.initialize({
        client_id: '340874428494-ot9uprkvvq4ha529arl97e9mehfojm5b.apps.googleusercontent.com',
        callback: (response) => handleCredentialResponse(response),
      });

      google.accounts.id.renderButton(
        document.getElementById("buttonDiv"),
        { theme: "outline", size: "large", text: "login_with_google" }
      );

      google.accounts.id.prompt();
    } catch (error) {
      console.log('error', error);
    }
  };

  useEffect(() => {
    const _root = document.getElementById('root');
    const script_id = document.getElementById('google-login');

    if (script_id) {
      _root.removeChild(script_id);
    }

    const _script = document.createElement('script');
    _script.src = 'https://accounts.google.com/gsi/client';
    _script.async = true;
    _script.id = 'google-login';
    _script.defer = true;
    _root.appendChild(_script);

    _script.onload = _get_auth;
  }, []);

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
    >
      {showLoginButton && <div id="buttonDiv"></div>}
    </Box>
  );
};

export default GoogleLogin;
