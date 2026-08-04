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
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  InputAdornment,
} from "@mui/material";

const emptyForm = {
  nombre: "",
  objetivo_escuela: "",
  id_dependencia: "",
  id_responde_a: "",
  id_desafio: "",
  id_estrategia_convergente: "",
  id_estrategia_facultad: "",
  id_programa_inst: "",
  id_indicador_resultado: "",
  id_periodo: "",
  logro: "",
  responsable: "",
  suma_facultad: false,
  url_documento_evidencia: "",
  meta_2025: "",
  meta_2026: "",
  meta_2027: "",
  meta_2028: "",
  meta_2029: "",
  meta_2030: "",
};

const toText = (value) => String(value ?? "").trim() || "No disponible";

const EditModal = ({
  open,
  loading,
  indicator,
  evidenceUrl = "",
  dependencias,
  respondeAs,
  desafios,
  estrategiasConvergentes,
  estrategiasFacultad,
  programasInstitucionales,
  indicadoresResultado,
  periodos,
  usuarios,
  metas,
  mode = "full",
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [metaType, setMetaType] = useState("");

  useEffect(() => {
    if (open && indicator) {
      const meta =
        indicator.meta ||
        metas?.find(
          (item) =>
            String(item.id_indicador_producto || "") ===
            String(indicator.id || ""),
        );

      const m25 = String(meta?.meta_2025 ?? "");
      const m26 = String(meta?.meta_2026 ?? "");
      const m27 = String(meta?.meta_2027 ?? "");
      const m28 = String(meta?.meta_2028 ?? "");
      const m29 = String(meta?.meta_2029 ?? "");
      const m30 = String(meta?.meta_2030 ?? "");
      
      const hasPercentage = [m25, m26, m27, m28, m29, m30].some(m => m.includes("%"));
      const hasNumber = [m25, m26, m27, m28, m29, m30].some(m => m !== "" && !m.includes("%"));

      let initialMetaType = "";
      if (hasPercentage) initialMetaType = "percentage";
      else if (hasNumber) initialMetaType = "number";

      setMetaType(initialMetaType);

      const stripPct = (val) => val.replace("%", "").trim();

      setForm({
        nombre: indicator.nombre || "",
        objetivo_escuela: indicator.objetivo_escuela || "",
        id_dependencia: String(indicator.id_dependencia || ""),
        id_responde_a: String(indicator.id_responde_a || ""),
        id_desafio: String(indicator.id_desafio || ""),
        id_estrategia_convergente: String(
          indicator.id_estrategia_convergente || "",
        ),
        id_estrategia_facultad: String(indicator.id_estrategia_facultad || ""),
        id_programa_inst: String(indicator.id_programa_inst || ""),
        id_indicador_resultado: String(indicator.id_indicador_resultado || ""),
        id_periodo: String(indicator.id_periodo || ""),
        logro: String(indicator.logro || ""),
        responsable: String(indicator.responsable || ""),
        suma_facultad:
          String(indicator.suma_facultad).toLowerCase() === "true" ||
          indicator.suma_facultad === true ||
          indicator.suma_facultad === 1,
        url_documento_evidencia: evidenceUrl || "",
        meta_2025: stripPct(m25),
        meta_2026: stripPct(m26),
        meta_2027: stripPct(m27),
        meta_2028: stripPct(m28),
        meta_2029: stripPct(m29),
        meta_2030: stripPct(m30),
      });
    }
  }, [open, indicator, evidenceUrl, metas]);

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
    const formatMeta = (val) => {
      if (val === "") return val;
      return metaType === "percentage" ? `${val}%` : val;
    };
    
    onSubmit({
      ...form,
      meta_2025: formatMeta(form.meta_2025),
      meta_2026: formatMeta(form.meta_2026),
      meta_2027: formatMeta(form.meta_2027),
      meta_2028: formatMeta(form.meta_2028),
      meta_2029: formatMeta(form.meta_2029),
      meta_2030: formatMeta(form.meta_2030),
    });
  };

  const handleMetaChange = (field) => (event) => {
    const nextValue = event.target.value;
    if (nextValue !== "" && Number.isNaN(Number(nextValue))) return;
    setForm((prev) => ({ ...prev, [field]: nextValue }));
  };

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
  const responsableOptions = useMemo(() => {
    if (!form.id_dependencia) return [];
    return usuarios.filter(
      (item) =>
        String(item.id_dependencia || "") === String(form.id_dependencia || ""),
    );
  }, [usuarios, form.id_dependencia]);

  const isLogroOnly = mode === "logro";
  const canSubmit = isLogroOnly ? form.logro : form.nombre;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Editar indicador</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          {isLogroOnly ? (
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={5}
                label="Logro"
                value={form.logro}
                onChange={handleChange("logro")}
              />
            </Grid>
          ) : (
            <>
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
                  <MenuItem value="">Sin relacion</MenuItem>
                  {respondeAs.map((item) => (
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
              <Grid item xs={12} md={12}>
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
              <Grid item xs={12} md={12}>
                <FormControl component="fieldset" sx={{ mt: 1 }}>
                  <FormLabel component="legend">Tipo de metas</FormLabel>
                  <RadioGroup
                    row
                    value={metaType}
                    onChange={(e) => setMetaType(e.target.value)}
                  >
                    <FormControlLabel value="number" control={<Radio />} label="Número" />
                    <FormControlLabel value="percentage" control={<Radio />} label="Porcentaje" />
                  </RadioGroup>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                label="Meta 2025"
                type="text"
                InputProps={{
                  endAdornment: metaType === "percentage" ? <InputAdornment position="end">%</InputAdornment> : null,
                }}
                value={form.meta_2025}
                  onChange={handleMetaChange("meta_2025")}
                  disabled={!metaType}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                label="Meta 2026"
                type="text"
                InputProps={{
                  endAdornment: metaType === "percentage" ? <InputAdornment position="end">%</InputAdornment> : null,
                }}
                value={form.meta_2026}
                  onChange={handleMetaChange("meta_2026")}
                  disabled={!metaType}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                label="Meta 2027"
                type="text"
                InputProps={{
                  endAdornment: metaType === "percentage" ? <InputAdornment position="end">%</InputAdornment> : null,
                }}
                value={form.meta_2027}
                  onChange={handleMetaChange("meta_2027")}
                  disabled={!metaType}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                label="Meta 2028"
                type="text"
                InputProps={{
                  endAdornment: metaType === "percentage" ? <InputAdornment position="end">%</InputAdornment> : null,
                }}
                value={form.meta_2028}
                  onChange={handleMetaChange("meta_2028")}
                  disabled={!metaType}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                label="Meta 2029"
                type="text"
                InputProps={{
                  endAdornment: metaType === "percentage" ? <InputAdornment position="end">%</InputAdornment> : null,
                }}
                value={form.meta_2029}
                  onChange={handleMetaChange("meta_2029")}
                  disabled={!metaType}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                label="Meta 2030"
                type="text"
                InputProps={{
                  endAdornment: metaType === "percentage" ? <InputAdornment position="end">%</InputAdornment> : null,
                }}
                value={form.meta_2030}
                  onChange={handleMetaChange("meta_2030")}
                  disabled={!metaType}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="URL documento evidencia"
                  placeholder="https://docs.google.com/spreadsheets/..."
                  helperText="Enlace de Google Sheets del documento de evidencia"
                  value={form.url_documento_evidencia}
                  onChange={handleChange("url_documento_evidencia")}
                />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={loading || !canSubmit}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditModal;
