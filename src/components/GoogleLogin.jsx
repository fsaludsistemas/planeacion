import React, { useCallback, useEffect, useState } from 'react';
import { decodeToken } from 'react-jwt';
import Cookies from 'js-cookie';
import { Alert, Box, CircularProgress, Paper, Typography } from '@mui/material';
import { getData } from '../api/api';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '340874428494-ot9uprkvvq4ha529arl97e9mehfojm5b.apps.googleusercontent.com';

const formatDisplayName = (email = '', fullName = '') => {
  if (fullName) {
    return fullName;
  }

  const localPart = email.split('@')[0] || '';
  return localPart
    .split('.')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const GoogleLogin = ({ onLoginSuccess }) => {
  const [errorMessage, setErrorMessage] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleCredentialResponse = useCallback(async (response) => {
    if (!response?.credential) {
      setErrorMessage('No se recibió una credencial válida de Google.');
      return;
    }

    const decodedToken = decodeToken(response.credential);
    const email = (decodedToken?.email || '').toLowerCase();

    if (!email) {
      setErrorMessage('No fue posible identificar el correo de la cuenta seleccionada.');
      return;
    }

    setErrorMessage('');
    setIsAuthenticating(true);

    try {
      const payload = await getData();
      const users = Array.isArray(payload?.data?.USUARIOS) ? payload.data.USUARIOS : [];
      const matchedUser = users.find((item) => (item.correo || '').toLowerCase() === email);

      if (!matchedUser) {
        setErrorMessage('Tu cuenta no está habilitada para ingresar.');
        setIsAuthenticating(false);
        return;
      }

      const secureCookie = window.location.protocol === 'https:';
      const sessionUser = {
        id: String(matchedUser.id || ''),
        correo: matchedUser.correo || email,
        rol: matchedUser.rol || 'Usuario',
        id_dependencia: String(matchedUser.id_dependencia || ''),
        name: formatDisplayName(email, decodedToken?.name),
      };

      Cookies.set('token', response.credential, {
        expires: 5,
        sameSite: 'Lax',
        secure: secureCookie,
      });
      sessionStorage.setItem('loggedUser', JSON.stringify(sessionUser));
      onLoginSuccess(sessionUser, payload);
    } catch (error) {
      console.error('Error en la solicitud:', error);
      setErrorMessage('No fue posible validar el acceso. Intenta de nuevo.');
    } finally {
      setIsAuthenticating(false);
    }
  }, [onLoginSuccess]);

  const initializeGoogleAuth = useCallback(() => {
    if (!window.google?.accounts?.id) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });

    const buttonContainer = document.getElementById('buttonDiv');
    if (!buttonContainer) {
      return;
    }

    buttonContainer.innerHTML = '';
    window.google.accounts.id.renderButton(buttonContainer, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
      width: 280,
    });

    window.google.accounts.id.prompt();
  }, [handleCredentialResponse]);

  useEffect(() => {
    if (window.google?.accounts?.id) {
      initializeGoogleAuth();
      return undefined;
    }

    let script = document.getElementById('google-identity-script');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.id = 'google-identity-script';
      document.body.appendChild(script);
    }

    script.addEventListener('load', initializeGoogleAuth);

    return () => {
      script?.removeEventListener('load', initializeGoogleAuth);
    };
  }, [initializeGoogleAuth]);

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ backgroundColor: '#f4f6f8', padding: '16px' }}
    >
      <Paper elevation={4} sx={{ padding: '28px', maxWidth: '420px', width: '100%' }}>
        <Typography variant="h5" sx={{ marginBottom: '8px', fontWeight: 700 }}>
          Ingreso a Planeación
        </Typography>
        <Typography variant="body2" sx={{ marginBottom: '20px' }}>
          Usa tu cuenta institucional para ingresar.
        </Typography>

        {errorMessage && (
          <Alert severity="error" sx={{ marginBottom: '14px' }}>
            {errorMessage}
          </Alert>
        )}

        <Box sx={{ minHeight: '40px' }}>
          <div id="buttonDiv"></div>
        </Box>

        {isAuthenticating && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Validando permisos...</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default GoogleLogin;
