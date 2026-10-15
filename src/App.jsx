import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Container,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import Cookies from "js-cookie";
import Header from "./components/Header";
import LoadingIndicator from "./components/LoadingIndicator";
import GoogleLogin from "./components/GoogleLogin";
import IndicatorsPage from "./pages/IndicatorsPage";
import Usuarios from "./pages/Usuarios";
import Consolidados from "./pages/Consolidados";
import Documentos from "./pages/Documentos";
import { getData } from "./api/api";
import "./App.css";

const App = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [appData, setAppData] = useState(null);
  const [dataError, setDataError] = useState("");

  const resolveDataset = (payload) => {
    if (payload?.data && typeof payload.data === "object") {
      return payload.data;
    }

    if (payload && typeof payload === "object") {
      return payload;
    }

    return null;
  };

  const userRole = useMemo(
    () =>
      String(userInfo?.rol || userInfo?.permiso || "")
        .trim()
        .toLowerCase(),
    [userInfo],
  );
  const canManageUsers =
    userRole === "administrador" ||
    userRole === "sistemas" ||
    userRole === "calidad" ||
    String(userInfo?.id || "") === "0";
  const dependencyName = useMemo(() => {
    const dependencies = appData?.DEPENDENCIA || appData?.DEPENDENCIAS || [];
    return (
      dependencies.find(
        (item) => String(item.id) === String(userInfo?.id_dependencia),
      )?.nombre || "Sin dependencia"
    );
  }, [appData, userInfo]);

  useEffect(() => {
    const token = Cookies.get("token");
    const storedUser = sessionStorage.getItem("loggedUser");

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setIsLogged(true);
        setUserInfo(parsedUser);
      } catch (error) {
        console.error("Sesión inválida en storage:", error);
        Cookies.remove("token");
        sessionStorage.removeItem("loggedUser");
      }
    } else {
      Cookies.remove("token");
      sessionStorage.removeItem("loggedUser");
    }
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!isLogged || appData) {
        return;
      }

      setIsDataLoading(true);
      setDataError("");

      try {
        const payload = await getData();
        const dataset = resolveDataset(payload);

        if (!dataset) {
          throw new Error("No se obtuvo un dataset válido.");
        }

        setAppData(dataset);
      } catch (error) {
        console.error("Error cargando dataset principal:", error);
        setDataError("No se pudo cargar la información de la aplicación.");
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchAllData();
  }, [isLogged, appData]);

  const refreshAppData = useCallback(async () => {
    setIsDataLoading(true);
    setDataError("");

    try {
      const payload = await getData();
      const dataset = resolveDataset(payload);

      if (!dataset) {
        throw new Error("No se obtuvo un dataset válido.");
      }

      setAppData(dataset);
    } catch (error) {
      console.error("Error actualizando dataset principal:", error);
      setDataError("No se pudo actualizar la información de la aplicación.");
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  const handleChange = (event, newValue) => {
    setIsLoading(true);
    sessionStorage.removeItem("indicators.lastExpandedId");
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
    setDataError("");
  };

  const handleLogout = () => {
    Cookies.remove("token");
    sessionStorage.removeItem("loggedUser");
    setIsLogged(false);
    setUserInfo(null);
    setAppData(null);
    setCurrentTab(0);
    setDataError("");
  };

  const renderCurrentTab = () => {
    if (currentTab === 0) {
      return (
        <IndicatorsPage
          data={appData}
          userInfo={userInfo}
          onRefreshData={refreshAppData}
        />
      );
    }

    if (canManageUsers && currentTab === 1) {
      return <Usuarios data={appData} userInfo={userInfo} />;
    }

    const consolidationTab = canManageUsers ? 2 : 1;
    if (currentTab === consolidationTab) {
      return <Consolidados data={appData} userInfo={userInfo} />;
    }

    const documentsTab = canManageUsers ? 3 : 2;
    if (currentTab === documentsTab) {
      return (
        <Documentos
          data={appData}
          userInfo={userInfo}
          onRefreshData={refreshAppData}
        />
      );
    }

    return null;
  };

  return (
    <>
      {isLogged ? (
        <div>
          <Header
            userInfo={userInfo}
            dependencyName={dependencyName}
            onLogout={handleLogout}
          />
          <Container className="mt-5">
            <Paper
              elevation={0}
              sx={{
                mb: 2,
                p: { xs: 2, sm: 2.5 },
                border: "1px solid #cfe0e8",
                borderLeft: "5px solid #1976d2",
                borderRadius: 3,
                background: "linear-gradient(135deg, #f5fbff 0%, #eef6f8 100%)",
              }}
            >
              <Typography
                variant="h4"
                sx={{ color: "#164e63", fontWeight: 700, mb: 0.5 }}
              >
                Bienvenido al Sistema de Planeación y Seguimiento Estratégico
              </Typography>
              <Typography sx={{ color: "#1976d2", fontWeight: 600, mb: 1 }}>
                Facultad de Salud - {dependencyName}
              </Typography>
              <Typography sx={{ color: "#374151", mt: 1, maxWidth: 820 }}>
                Aquí encontrarás los indicadores, metas y avances de los
                proyectos que hacen posible nuestro direccionamiento
                estratégico.
              </Typography>
              <Typography
                sx={{
                  color: "#164e63",
                  fontStyle: "italic",
                  fontWeight: 600,
                  mt: 1,
                }}
              >
                Planear hoy para construir la Facultad de Salud que soñamos.
              </Typography>
            </Paper>
            <Box>
              <Tabs
                value={currentTab}
                onChange={handleChange}
                aria-label="Gestión de Indicadores Tabs"
              >
                <Tab
                  label="MDE"
                  sx={{ fontSize: "1rem", fontWeight: "bold" }}
                />
                {canManageUsers && (
                  <Tab
                    label="Gestión de Usuarios"
                    sx={{ fontSize: "1rem", fontWeight: "bold" }}
                  />
                )}
                <Tab
                  label="Seguimientos"
                  sx={{ fontSize: "1rem", fontWeight: "bold" }}
                />
                <Tab
                  label="Documentos"
                  sx={{ fontSize: "1rem", fontWeight: "bold" }}
                />
              </Tabs>
            </Box>
            <LoadingIndicator isLoading={isLoading || isDataLoading} />
            {dataError && (
              <Alert severity="error" sx={{ marginTop: "14px" }}>
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
