import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Divider,
} from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import EditNoteIcon from "@mui/icons-material/EditNote";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

const SyncSheetsModal = ({ open, onClose, loading, result, error }) => {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          fontWeight: 700,
          color: "#164e63",
          borderBottom: "1px solid #e0e0e0",
          pb: 1.5,
        }}
      >
        <SyncIcon sx={{ color: "#1976d2", fontSize: 28 }} />
        Sincronización con Google Sheets de Dependencias
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {loading && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 6,
              gap: 2,
            }}
          >
            <CircularProgress size={52} thickness={4} />
            <Typography variant="h6" sx={{ color: "#374151", fontWeight: 600 }}>
              Sincronizando información...
            </Typography>
            <Typography variant="body2" sx={{ color: "#6b7280", textAlign: "center", maxWidth: 450 }}>
              Consultando las hojas de cálculo de las dependencias, comparando metas, nombres y estructuras con la base de datos central.
            </Typography>
          </Box>
        )}

        {!loading && error && (
          <Alert severity="error" icon={<ErrorOutlineIcon />} sx={{ my: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Ocurrió un error al sincronizar:
            </Typography>
            <Typography variant="body2">{error}</Typography>
          </Alert>
        )}

        {!loading && result && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Alert
              severity="success"
              icon={<CheckCircleOutlineIcon />}
              sx={{
                bgcolor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {result.message || "Sincronización finalizada exitosamente"}
              </Typography>
              <Typography variant="caption" sx={{ color: "#15803d" }}>
                Ejecutado: {new Date(result.timestamp || Date.now()).toLocaleString("es-CO")}
              </Typography>
            </Alert>

            {/* Tarjetas de métricas globales */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
                gap: 1.5,
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  bgcolor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 2,
                  textAlign: "center",
                }}
              >
                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                  INDICADORES ACTUALIZADOS
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#0284c7" }}>
                  {result.totalIndicadoresActualizados ?? 0}
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  bgcolor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 2,
                  textAlign: "center",
                }}
              >
                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                  METAS ACTUALIZADAS
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#16a34a" }}>
                  {result.totalMetasActualizadas ?? 0}
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  bgcolor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 2,
                  textAlign: "center",
                }}
              >
                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                  AVANCES ACTUALIZADOS
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#d97706" }}>
                  {result.totalAvancesActualizados ?? 0}
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  bgcolor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 2,
                  textAlign: "center",
                }}
              >
                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                  NUEVOS CREADOS
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#9333ea" }}>
                  {result.totalNuevosIndicadores ?? 0}
                </Typography>
              </Paper>
            </Box>

            <Divider />

            {/* Detalle por dependencia */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#334155" }}>
              Detalle por Dependencia:
            </Typography>

            {result.dependencias && result.dependencias.length > 0 ? (
              result.dependencias.map((dep) => (
                <Paper
                  key={dep.id_dependencia}
                  elevation={0}
                  sx={{
                    p: 2,
                    border: "1px solid #e2e8f0",
                    borderRadius: 2,
                    bgcolor: "#ffffff",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 1,
                      mb: 1.5,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1e293b" }}>
                      {dep.nombre}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                      <Chip label={`Leídos: ${dep.read}`} size="small" variant="outlined" />
                      <Chip
                        label={`Actualizados: ${dep.updated}`}
                        size="small"
                        color={dep.updated > 0 ? "primary" : "default"}
                      />
                      <Chip
                        label={`Nuevos: ${dep.inserted}`}
                        size="small"
                        color={dep.inserted > 0 ? "secondary" : "default"}
                      />
                      <Chip
                        label={`Al día: ${dep.unchanged}`}
                        size="small"
                        color={dep.unchanged > 0 ? "success" : "default"}
                        variant="outlined"
                      />
                      {dep.hidden > 0 && (
                        <Chip
                          label={`Ocultos omitidos: ${dep.hidden}`}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Lista de cambios */}
                  {dep.changes && dep.changes.length > 0 ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
                      {dep.changes.map((item, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            p: 1.2,
                            borderRadius: 1.5,
                            bgcolor: item.type === "INSERT" ? "#faf5ff" : "#f0f9ff",
                            border: `1px solid ${item.type === "INSERT" ? "#e9d5ff" : "#bae6fd"}`,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                            {item.type === "INSERT" ? (
                              <Chip
                                icon={<AddCircleOutlineIcon />}
                                label="NUEVO"
                                size="small"
                                color="secondary"
                                sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }}
                              />
                            ) : (
                              <Chip
                                icon={<EditNoteIcon />}
                                label="ACTUALIZADO"
                                size="small"
                                color="primary"
                                sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }}
                              />
                            )}
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#1e293b" }}>
                              #{item.numInd} — {item.nombre}
                            </Typography>
                          </Box>

                          {item.diffs && item.diffs.length > 0 && (
                            <Box sx={{ pl: 2, mt: 0.5 }}>
                              {item.diffs.map((diff, dIdx) => (
                                <Typography
                                  key={dIdx}
                                  variant="caption"
                                  sx={{
                                    display: "block",
                                    color: "#475569",
                                    fontFamily: "monospace",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  ↳ {diff}
                                </Typography>
                              ))}
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: "#64748b", fontStyle: "italic", mt: 0.5 }}>
                      ✓ Todos los indicadores de esta dependencia se encuentran sincronizados y sin cambios pendientes.
                    </Typography>
                  )}
                </Paper>
              ))
            ) : (
              <Typography variant="body2" sx={{ color: "#64748b" }}>
                No hay dependencias habilitadas para sincronización.
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: "1px solid #e0e0e0" }}>
        <Button
          onClick={onClose}
          disabled={loading}
          variant="contained"
          sx={{
            bgcolor: "#1976d2",
            textTransform: "none",
            fontWeight: 600,
            "&:hover": { bgcolor: "#1565c0" },
          }}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SyncSheetsModal;
