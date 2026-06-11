import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Typography,
} from "@mui/material";

const toText = (value) => String(value ?? "").trim() || "No disponible";

const DetailItem = ({ label, value }) => (
  <Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
    <Typography
      variant="caption"
      sx={{ fontWeight: 800, color: "text.secondary" }}
    >
      {label}
    </Typography>
    <Typography variant="body2" sx={{ mt: 0.5 }}>
      {toText(value)}
    </Typography>
  </Paper>
);

const ModalDetails = ({
  open,
  indicator,
  dependencias,
  desafios,
  estrategiasConvergentes,
  estrategiasFacultad,
  programasInstitucionales,
  indicadoresResultado,
  periodos,
  onClose,
}) => {
  if (!indicator) return null;
  console.log({ indicator });
  console.log({ periodos });
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Detalles del indicador</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <DetailItem label="Nombre" value={indicator.nombre} />
          </Grid>
          <Grid item xs={12} md={6}>
            <DetailItem
              label="Objetivo escuela"
              value={indicator.objetivo_escuela}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <DetailItem
              label="Dependencia"
              value={
                dependencias.find(
                  (item) =>
                    String(item.id) === String(indicator.id_dependencia),
                )?.nombre
              }
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <DetailItem
              label="Desafio"
              value={
                desafios.find(
                  (item) => String(item.id) === String(indicator.id_desafio),
                )?.titulo
              }
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <DetailItem
              label="Estrategia convergente"
              value={
                estrategiasConvergentes.find(
                  (item) =>
                    String(item.id) ===
                    String(indicator.id_estrategia_convergente),
                )?.titulo
              }
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <DetailItem
              label="Estrategia facultad"
              value={
                estrategiasFacultad.find(
                  (item) =>
                    String(item.id) ===
                    String(indicator.id_estrategia_facultad),
                )?.titulo
              }
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <DetailItem
              label="Programa institucional"
              value={
                programasInstitucionales.find(
                  (item) =>
                    String(item.id) === String(indicator.id_programa_inst),
                )?.titulo
              }
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <DetailItem
              label="Indicador resultado"
              value={
                indicadoresResultado.find(
                  (item) =>
                    String(item.id) ===
                    String(indicator.id_indicador_resultado),
                )?.nombre
              }
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <DetailItem
              label="Periodo"
              value={periodos.map(
                (item) =>
                  String(item.id) === String(indicator.id_periodo) &&
                  `${item.anio_ini}-${item.anio_final}`,
              )}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModalDetails;
