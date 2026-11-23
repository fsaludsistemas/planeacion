import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import Cookies from "js-cookie";
import Header from "./components/Header";
import LoadingIndicator from "./components/LoadingIndicator";
import GoogleLogin from "./components/GoogleLogin";
import SyncSheetsModal from "./components/SyncSheetsModal";
import IndicatorsPage from "./pages/IndicatorsPage";
import Usuarios from "./pages/Usuarios";
import Consolidados from "./pages/Consolidados";
import Documentos from "./pages/Documentos";
import { getData, syncSheets } from "./api/api";
import { formatDependenciesList } from "./utils/formatters";
import "./App.css";

const App = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [appData, setAppData] = useState(null);
  const [dataError, setDataError] = useState("");
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncError, setSyncError] = useState("");

  const resolveDataset = (payload) => {
    let raw = null;
    if (payload?.data && typeof payload.data === "object") {
      raw = payload.data;
    } else if (payload && typeof payload === "object") {
      raw = payload;
    }

    if (!raw) return null;

    const dataset = { ...raw };
    if (Array.isArray(dataset.DEPENDENCIAS)) {
      dataset.DEPENDENCIAS = formatDependenciesList(dataset.DEPENDENCIAS);
    }
    if (Array.isArray(dataset.DEPENDENCIA)) {
      dataset.DEPENDENCIA = formatDependenciesList(dataset.DEPENDENCIA);
    }

    return dataset;
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
  const isAdmin =
    userRole === "administrador" ||
    userRole === "sistemas" ||
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

  const syncCurrentUser = useCallback((dataset, currentUser) => {
    if (!dataset || !currentUser) return currentUser;

    const users = Array.isArray(dataset?.USUARIOS)
      ? dataset.USUARIOS
      : Array.isArray(dataset?.USUARIO)
        ? dataset.USUARIO
        : [];

    const userEmail = (currentUser?.correo || "").trim().toLowerCase();
    const userId = String(currentUser?.id || "").trim();

    const matchedUser = users.find((item) => {
      const emailMatches =
        userEmail && (item.correo || "").trim().toLowerCase() === userEmail;
      const idMatches = userId && String(item.id || "").trim() === userId;
      return emailMatches || idMatches;
    });

    if (!matchedUser) {
      console.warn(
        "Usuario no encontrado en la lista de usuarios autorizados.",
      );
      return null;
    }

    const updatedUser = {
      ...currentUser,
      id: String(matchedUser.id ?? currentUser.id ?? ""),
      correo: matchedUser.correo || currentUser.correo,
      rol: matchedUser.rol || currentUser.rol || "Usuario",
      id_dependencia: String(matchedUser.id_dependencia ?? ""),
      editor:
        matchedUser.editor === true ||
        String(matchedUser.editor).toLowerCase() === "true",
      name:
        currentUser.name ||
        (matchedUser.correo ? matchedUser.correo.split("@")[0] : "Usuario"),
    };

    if (
      String(currentUser.id_dependencia) !== String(updatedUser.id_dependencia)
    ) {
      sessionStorage.removeItem("indicators.filters");
      sessionStorage.removeItem("indicators.lastExpandedId");
    }

    sessionStorage.setItem("loggedUser", JSON.stringify(updatedUser));
    return updatedUser;
  }, []);

  const applyDatasetAndSyncUser = useCallback(
    (dataset) => {
      setAppData(dataset);

      setUserInfo((prevUser) => {
        let baseUser = prevUser;
        if (!baseUser) {
          try {
            const stored = sessionStorage.getItem("loggedUser");
            if (stored) baseUser = JSON.parse(stored);
          } catch {
            baseUser = null;
          }
        }

        if (!baseUser) return null;

        const updated = syncCurrentUser(dataset, baseUser);
        if (!updated) {
          Cookies.remove("token");
          sessionStorage.removeItem("loggedUser");
          sessionStorage.removeItem("indicators.filters");
          sessionStorage.removeItem("indicators.lastExpandedId");
          setIsLogged(false);
          setDataError("Tu cuenta ya no está habilitada para ingresar.");
          return null;
        }

        return updated;
      });
    },
    [syncCurrentUser],
  );

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

        applyDatasetAndSyncUser(dataset);
      } catch (error) {
        console.error("Error cargando dataset principal:", error);
        setDataError("No se pudo cargar la información de la aplicación.");
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchAllData();
  }, [isLogged, appData, applyDatasetAndSyncUser]);

  const refreshAppData = useCallback(async () => {
    setIsDataLoading(true);
    setDataError("");

    try {
      const payload = await getData();
      const dataset = resolveDataset(payload);

      if (!dataset) {
        throw new Error("No se obtuvo un dataset válido.");
      }

      applyDatasetAndSyncUser(dataset);
    } catch (error) {
      console.error("Error actualizando dataset principal:", error);
      setDataError("No se pudo actualizar la información de la aplicación.");
    } finally {
      setIsDataLoading(false);
    }
  }, [applyDatasetAndSyncUser]);

  const handleSyncSheets = async () => {
    setIsSyncModalOpen(true);
    setIsSyncing(true);
    setSyncResult(null);
    setSyncError("");

    try {
      const res = await syncSheets();
      setSyncResult(res);
      await refreshAppData();
    } catch (err) {
      console.error("Error al sincronizar hojas:", err);
      setSyncError(
        err.response?.data?.message ||
          err.message ||
          "Error al comunicarse con el servidor para sincronizar.",
      );
    } finally {
      setIsSyncing(false);
    }
  };

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
      return (
        <Usuarios
          data={appData}
          userInfo={userInfo}
          onRefreshData={refreshAppData}
        />
      );
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
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1.5,
                borderBottom: 1,
                borderColor: "divider",
                mb: 1.5,
              }}
            >
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

              {isAdmin && (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<SyncIcon />}
                  onClick={handleSyncSheets}
                  disabled={isSyncing || isDataLoading}
                  sx={{
                    fontWeight: 700,
                    textTransform: "none",
                    borderRadius: 2,
                    borderWidth: 1.5,
                    "&:hover": { borderWidth: 1.5 },
                  }}
                >
                  {isSyncing ? "Sincronizando..." : "Sincronizar MDE's"}
                </Button>
              )}
            </Box>

            <SyncSheetsModal
              open={isSyncModalOpen}
              onClose={() => setIsSyncModalOpen(false)}
              loading={isSyncing}
              result={syncResult}
              error={syncError}
            />
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
