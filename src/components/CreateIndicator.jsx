import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
} from "@mui/material";

const emptyForm = {
  nombre: "",
  objetivo_escuela: "",
  id_dependencia: "",
  id_desafio: "",
  id_estrategia_convergente: "",
  id_estrategia_facultad: "",
  id_programa_inst: "",
  id_indicador_resultado: "",
  id_periodo: "",
};

const toText = (value) => String(value ?? "").trim() || "No disponible";

const CreateIndicator = ({
  open,
  loading,
  dependencias,
  desafios,
  estrategiasConvergentes,
  estrategiasFacultad,
  programasInstitucionales,
  indicadoresResultado,
  periodos,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open) setForm(emptyForm);
  }, [open]);

  const canSubmit = useMemo(() => {
    return form.nombre && form.id_desafio;
  }, [form]);

  const convergenteOptions = useMemo(
    () =>
      form.id_desafio
        ? estrategiasConvergentes.filter(
            (item) =>
              String(item.id_desafio || "") === String(form.id_desafio || ""),
          )
        : estrategiasConvergentes,
    [estrategiasConvergentes, form.id_desafio],
  );
  const facultadOptions = useMemo(
    () =>
      form.id_estrategia_convergente
        ? estrategiasFacultad.filter(
            (item) =>
              String(
                item.id_convergente || item.id_estrategia_convergente || "",
              ) === String(form.id_estrategia_convergente || ""),
          )
        : estrategiasFacultad,
    [estrategiasFacultad, form.id_estrategia_convergente],
  );
  const programaOptions = useMemo(
    () =>
      form.id_estrategia_facultad
        ? programasInstitucionales.filter(
            (item) =>
              String(item.id_estrategia_facultad || "") ===
              String(form.id_estrategia_facultad || ""),
          )
        : programasInstitucionales,
    [programasInstitucionales, form.id_estrategia_facultad],
  );
  const resultadoOptions = useMemo(
    () =>
      form.id_programa_inst
        ? indicadoresResultado.filter(
            (item) =>
              String(item.id_programa_inst || "") ===
              String(form.id_programa_inst || ""),
          )
        : indicadoresResultado,
    [indicadoresResultado, form.id_programa_inst],
  );

  const handleChange = (field) => (event) => {
    setForm((prev) => {
      const nextValue = event.target.value;
      const next = { ...prev, [field]: nextValue };
      if (field === "id_desafio") {
        next.id_estrategia_convergente = "";
        next.id_estrategia_facultad = "";
        next.id_programa_inst = "";
        next.id_indicador_resultado = "";
      }
      if (field === "id_estrategia_convergente") {
        next.id_estrategia_facultad = "";
        next.id_programa_inst = "";
        next.id_indicador_resultado = "";
      }
      if (field === "id_estrategia_facultad") {
        next.id_programa_inst = "";
        next.id_indicador_resultado = "";
      }
      if (field === "id_programa_inst") {
        next.id_indicador_resultado = "";
      }
      return next;
    });
  };

  const submit = () => {
    onSubmit(form);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Crear indicador</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              height="80%"
              label="Nombre"
              value={form.nombre}
              onChange={handleChange("nombre")}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              multiline
              minRows={4}
              label="Objetivo escuela"
              value={form.objetivo_escuela}
              onChange={handleChange("objetivo_escuela")}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Dependencia"
              value={form.id_dependencia}
              onChange={handleChange("id_dependencia")}
            >
              {dependencias.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.nombre)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Desafio"
              value={form.id_desafio}
              onChange={handleChange("id_desafio")}
            >
              {desafios.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.titulo)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Estrategia convergente"
              value={form.id_estrategia_convergente}
              onChange={handleChange("id_estrategia_convergente")}
            >
              <MenuItem value="">Sin relacion</MenuItem>
              {convergenteOptions.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.titulo)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Estrategia facultad"
              value={form.id_estrategia_facultad}
              onChange={handleChange("id_estrategia_facultad")}
            >
              <MenuItem value="">Sin relacion</MenuItem>
              {facultadOptions.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.titulo)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Programa institucional"
              value={form.id_programa_inst}
              onChange={handleChange("id_programa_inst")}
            >
              <MenuItem value="">Sin relacion</MenuItem>
              {programaOptions.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.titulo)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Indicador resultado"
              value={form.id_indicador_resultado}
              onChange={handleChange("id_indicador_resultado")}
            >
              <MenuItem value="">Sin relacion</MenuItem>
              {resultadoOptions.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.nombre)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Periodo"
              value={form.id_periodo}
              onChange={handleChange("id_periodo")}
            >
              <MenuItem value="">Sin relacion</MenuItem>
              {periodos.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.nombre || `${item.anio_ini}-${item.anio_final}`)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={loading || !canSubmit}
        >
          Crear
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateIndicator;
