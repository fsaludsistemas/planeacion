import React, { useState, useEffect } from 'react';
import { Alert, Box, Container, Tab, Tabs, Typography } from '@mui/material';
import Header from './components/Header';
import LoadingIndicator from './components/LoadingIndicator';
import GoogleLogin from './components/GoogleLogin';
import IndicatorsPage from './pages/IndicatorsPage';
import { getData } from './api/api';
import Cookies from 'js-cookie';
import './App.css';

const App = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [appData, setAppData] = useState(null);
  const [dataError, setDataError] = useState('');

  const resolveDataset = (payload) => {
    if (payload?.data && typeof payload.data === 'object') {
      return payload.data;
    }

    if (payload && typeof payload === 'object') {
      return payload;
    }

    return null;
  };

  useEffect(() => {
    const token = Cookies.get('token');
    const storedUser = sessionStorage.getItem('loggedUser');

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setIsLogged(true);
        setUserInfo(parsedUser);
      } catch (error) {
        console.error('Sesión inválida en storage:', error);
        Cookies.remove('token');
        sessionStorage.removeItem('loggedUser');
      }
    } else {
      Cookies.remove('token');
      sessionStorage.removeItem('loggedUser');
    }
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!isLogged || appData) {
        return;
      }

      setIsDataLoading(true);
      setDataError('');

      try {
        const payload = await getData();
        const dataset = resolveDataset(payload);

        if (!dataset) {
          throw new Error('No se obtuvo un dataset válido.');
        }

        setAppData(dataset);
      } catch (error) {
        console.error('Error cargando dataset principal:', error);
        setDataError('No se pudo cargar la información de la aplicación.');
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchAllData();
  }, [isLogged, appData]);

  const handleChange = (event, newValue) => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentTab(newValue);
      setIsLoading(false);
    }, 250);
  };

  const handleLoginSuccess = (sessionUser, payload) => {
    const dataset = resolveDataset(payload);
    setIsLogged(true);
    setUserInfo(sessionUser);
    setAppData(dataset);
    setDataError('');
  };

  const handleLogout = () => {
    Cookies.remove('token');
    sessionStorage.removeItem('loggedUser');
    setIsLogged(false);
    setUserInfo(null);
    setAppData(null);
    setCurrentTab(0);
    setDataError('');
  };

  const renderCurrentTab = () => {
    if (currentTab === 0) {
      return <IndicatorsPage data={appData} userInfo={userInfo} />;
    }

    if (currentTab === 1) {
      return (
        <Box sx={{ padding: '20px 0' }}>
          <Typography variant="h6">Consolidado Ind.</Typography>
          <Typography variant="body2">Módulo en desarrollo.</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ padding: '20px 0' }}>
        <Typography variant="h6">Avances</Typography>
        <Typography variant="body2">Módulo en desarrollo.</Typography>
      </Box>
    );
  };

  return (
    <>
      {isLogged ? (
        <div>
          <Header userInfo={userInfo} onLogout={handleLogout} />
          <Container className="mt-5">
            <Box>
              <Tabs
                value={currentTab}
                onChange={handleChange}
                aria-label="Gestión de Indicadores Tabs"
              >
                <Tab 
                  label="Indicadores" 
                  sx={{ fontSize: '1rem', fontWeight: 'bold' }}
                  />
                <Tab 
                  label="Consolidado Ind." 
                  sx={{ fontSize: '1rem', fontWeight: 'bold' }}
                  />
                <Tab 
                  label="Avances" 
                  sx={{ fontSize: '1rem', fontWeight: 'bold' }}
                  />
              </Tabs>
            </Box>
            <LoadingIndicator isLoading={isLoading || isDataLoading} />
            {dataError && (
              <Alert severity="error" sx={{ marginTop: '14px' }}>
                {dataError}
              </Alert>
            )}
            {!isDataLoading && !dataError && renderCurrentTab()}
          </Container>
        </div>
      ) : (
        <GoogleLogin onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
};

export default App;
