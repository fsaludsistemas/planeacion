import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  TextField,
} from "@mui/material";

const emptyForm = {
  nombre: "",
  objetivo_escuela: "",
  id_dependencia: "",
  id_responde_a: "",
  create_responde_a: false,
  responde_a_nombre: "",
  id_desafio: "",
  id_estrategia_convergente: "",
  id_estrategia_facultad: "",
  id_programa_inst: "",
  id_indicador_resultado: "",
  logro: "",
  responsable: "",
  suma_facultad: false,
  id_periodo: "1",
  meta_2025: "",
  meta_2026: "",
  meta_2027: "",
  meta_2028: "",
  meta_2029: "",
  meta_2030: "",
};

const toText = (value) => String(value ?? "").trim() || "No disponible";

const CreateIndicator = ({
  open,
  loading,
  dependencias,
  respondeAs,
  desafios,
  estrategiasConvergentes,
  estrategiasFacultad,
  programasInstitucionales,
  indicadoresResultado,
  usuarios,
  periodos,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [respondeADialogOpen, setRespondeADialogOpen] = useState(false);
  const [respondeADraft, setRespondeADraft] = useState("");

  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setRespondeADialogOpen(false);
      setRespondeADraft("");
    }
  }, [open]);

  const fallbackOptions = (items, relatedItems) =>
    relatedItems.length ? relatedItems : items;

  const canSubmit = useMemo(() => {
    return form.nombre && form.id_desafio;
  }, [form.nombre, form.id_desafio]);

  const handleMetaChange = (field) => (event) => {
    const nextValue = event.target.value;
    if (nextValue !== "" && Number.isNaN(Number(nextValue))) return;
    setForm((prev) => ({ ...prev, [field]: nextValue }));
  };

  const convergenteOptions = useMemo(
    () =>
      fallbackOptions(
        estrategiasConvergentes,
        form.id_desafio
          ? estrategiasConvergentes.filter(
              (item) =>
                String(item.id_desafio || "") === String(form.id_desafio || ""),
            )
          : estrategiasConvergentes,
      ),
    [estrategiasConvergentes, form.id_desafio],
  );
  const facultadOptions = useMemo(
    () =>
      fallbackOptions(
        estrategiasFacultad,
        form.id_estrategia_convergente
          ? estrategiasFacultad.filter(
              (item) =>
                String(
                  item.id_convergente || item.id_estrategia_convergente || "",
                ) === String(form.id_estrategia_convergente || ""),
            )
          : estrategiasFacultad,
      ),
    [estrategiasFacultad, form.id_estrategia_convergente],
  );
  const programaOptions = useMemo(
    () =>
      fallbackOptions(
        programasInstitucionales,
        form.id_estrategia_facultad
          ? programasInstitucionales.filter(
              (item) =>
                String(item.id_estrategia_facultad || "") ===
                String(form.id_estrategia_facultad || ""),
            )
          : programasInstitucionales,
      ),
    [programasInstitucionales, form.id_estrategia_facultad],
  );
  const resultadoOptions = useMemo(
    () =>
      fallbackOptions(
        indicadoresResultado,
        form.id_programa_inst
          ? indicadoresResultado.filter(
              (item) =>
                String(item.id_programa_inst || "") ===
                String(form.id_programa_inst || ""),
            )
          : indicadoresResultado,
      ),
    [indicadoresResultado, form.id_programa_inst],
  );
  const respondeAOptions = useMemo(() => respondeAs, [respondeAs]);
  const responsableOptions = useMemo(() => {
    if (!form.id_dependencia) return [];
    return usuarios.filter(
      (item) =>
        String(item.id_dependencia || "") === String(form.id_dependencia || ""),
    );
  }, [usuarios, form.id_dependencia]);

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
      if (field === "id_dependencia") {
        next.responsable = "";
      }
      if (field === "id_programa_inst") {
        next.id_indicador_resultado = "";
      }
      if (field === "id_responde_a") {
        if (nextValue === "__new__") {
          next.create_responde_a = true;
          next.id_responde_a = "";
          setRespondeADraft("");
          setRespondeADialogOpen(true);
        } else {
          next.create_responde_a = false;
          next.id_responde_a = nextValue;
        }
      }
      return next;
    });
  };

  const handleCloseRespondeADialog = () => {
    setRespondeADialogOpen(false);
    setRespondeADraft("");
    setForm((prev) => ({
      ...prev,
      create_responde_a: false,
      id_responde_a: "",
    }));
  };

  const handleConfirmRespondeA = () => {
    const name = respondeADraft.trim();
    if (!name) return;
    setForm((prev) => ({
      ...prev,
      create_responde_a: true,
      responde_a_nombre: name,
    }));
    setRespondeADialogOpen(false);
  };

  const submit = () => {
    onSubmit(form);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>Crear indicador</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                minRows={4}
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
                <MenuItem value="" disabled>
                  Seleccione una dependencia
                </MenuItem>
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
                label="Responde a"
                value={form.id_responde_a}
                onChange={handleChange("id_responde_a")}
              >
                <MenuItem value="" disabled>
                  Seleccione una opción
                </MenuItem>
                <MenuItem value="__new__">Crear nuevo responde a</MenuItem>
                {respondeAOptions.map((item) => (
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
                <MenuItem value="" disabled>
                  Seleccione un desafio
                </MenuItem>
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
                <MenuItem value="" disabled>
                  Seleccione una estrategia convergente
                </MenuItem>
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
                <MenuItem value="" disabled>
                  Seleccione una estrategia facultad
                </MenuItem>
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
                <MenuItem value="" disabled>
                  Seleccione un programa institucional
                </MenuItem>
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
                <MenuItem value="" disabled>
                  Seleccione un indicador resultado
                </MenuItem>
                {resultadoOptions.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {toText(item.nombre)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                multiline
                minRows={4}
                label="Logro (opcional)"
                value={form.logro}
                onChange={handleChange("logro")}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Responsable"
                value={form.responsable}
                onChange={handleChange("responsable")}
                disabled={!form.id_dependencia}
              >
                <MenuItem value="">Sin responsable</MenuItem>
                {responsableOptions.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {toText(item.correo)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                sx={{ mt: 1 }}
                control={
                  <Checkbox
                    checked={Boolean(form.suma_facultad)}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        suma_facultad: event.target.checked,
                      }))
                    }
                  />
                }
                label="Suma facultad"
              />
            </Grid>
            <Grid item xs={8} md={2}>
              <TextField
                fullWidth
                label="Meta 2025"
                type="number"
                inputProps={{ step: "any" }}
                value={form.meta_2025}
                onChange={handleMetaChange("meta_2025")}
              />
            </Grid>
            <Grid item xs={8} md={2}>
              <TextField
                fullWidth
                label="Meta 2026"
                type="number"
                inputProps={{ step: "any" }}
                value={form.meta_2026}
                onChange={handleMetaChange("meta_2026")}
              />
            </Grid>
            <Grid item xs={8} md={2}>
              <TextField
                fullWidth
                label="Meta 2027"
                type="number"
                inputProps={{ step: "any" }}
                value={form.meta_2027}
                onChange={handleMetaChange("meta_2027")}
              />
            </Grid>
            <Grid item xs={8} md={2}>
              <TextField
                fullWidth
                label="Meta 2028"
                type="number"
                inputProps={{ step: "any" }}
                value={form.meta_2028}
                onChange={handleMetaChange("meta_2028")}
              />
            </Grid>
            <Grid item xs={8} md={2}>
              <TextField
                fullWidth
                label="Meta 2029"
                type="number"
                inputProps={{ step: "any" }}
                value={form.meta_2029}
                onChange={handleMetaChange("meta_2029")}
              />
            </Grid>
            <Grid item xs={8} md={2}>
              <TextField
                fullWidth
                label="Meta 2030"
                type="number"
                inputProps={{ step: "any" }}
                value={form.meta_2030}
                onChange={handleMetaChange("meta_2030")}
              />
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

      <Dialog
        open={respondeADialogOpen}
        onClose={handleCloseRespondeADialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Nuevo responde a</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            fullWidth
            label="Nombre"
            value={respondeADraft}
            onChange={(event) => setRespondeADraft(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRespondeADialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmRespondeA}>
            Crear
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CreateIndicator;
