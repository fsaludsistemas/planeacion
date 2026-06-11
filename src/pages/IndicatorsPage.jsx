import React, { useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import CreateIndicator from "../components/CreateIndicator";
import EditModal from "../components/EditModal";
import ModalDetails from "../components/ModalDetails";
import { createSheetRow, deleteSheetRow, updateSheetRow } from "../api/api";
import "../styles/indicators.css";

const SHEET_NAME = "INDICADORES_PRODUCTO";
const META_SHEET_NAME = "METAS";

const toArray = (value) => (Array.isArray(value) ? value : []);
const toText = (value) => String(value ?? "").trim() || "No disponible";
const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const getSheet = (data, ...keys) => {
  for (const key of keys) {
    const value = data?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const sortById = (items) =>
  [...items].sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));

const getTipoDependencia = (dependencia) => {
  const value = normalize(dependencia?.tipo);
  if (value === "escuela") return "Escuela";
  if (value === "oficina") return "Oficina";
  return "No definido";
};

const IndicatorsPage = ({ data, userInfo }) => {
  const [filters, setFilters] = useState({
    dependencia: "",
    tipoDependencia: "TODAS",
    desafio: "",
    estrategiaConvergente: "",
    estrategiaFacultad: "",
    programaInstitucional: "",
    indicadorResultado: "",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editState, setEditState] = useState({ open: false, indicator: null });
  const [detailsState, setDetailsState] = useState({
    open: false,
    indicator: null,
  });
  const [expandedId, setExpandedId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");

  const sessionUser = useMemo(() => {
    if (userInfo) return userInfo;
    try {
      const stored = sessionStorage.getItem("loggedUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [userInfo]);

  const indicators = useMemo(
    () => sortById(getSheet(data, "INDICADORES_PRODUCTO")),
    [data],
  );
  const dependencias = useMemo(
    () => sortById(getSheet(data, "DEPENDENCIA", "DEPENDENCIAS")),
    [data],
  );
  const desafios = useMemo(() => sortById(getSheet(data, "DESAFIOS")), [data]);
  const estrategiasConvergentes = useMemo(
    () =>
      sortById(
        getSheet(data, "ESTRATEGIA_CONVERGENTE", "ESTRATEGIA_CONVERGENTE"),
      ),
    [data],
  );

  const periodos = useMemo(() => sortById(getSheet(data, "PERIODO")), [data]);
  const estrategiasFacultad = useMemo(
    () => sortById(getSheet(data, "ESTRATEGIA_FACULTAD")),
    [data],
  );
  const programasInstitucionales = useMemo(
    () => sortById(getSheet(data, "PROGRAMAS_INST")),
    [data],
  );
  const indicadoresResultado = useMemo(
    () => sortById(getSheet(data, "INDICADORES_RESULTADO")),
    [data],
  );
  const metas = useMemo(() => sortById(getSheet(data, "METAS")), [data]);
  const avances = useMemo(() => sortById(getSheet(data, "AVANCES")), [data]);

  const byId = (items) => new Map(items.map((item) => [String(item.id), item]));
  const dependenciaById = useMemo(() => byId(dependencias), [dependencias]);
  const desafioById = useMemo(() => byId(desafios), [desafios]);
  const convergenteById = useMemo(
    () => byId(estrategiasConvergentes),
    [estrategiasConvergentes],
  );
  const facultadById = useMemo(
    () => byId(estrategiasFacultad),
    [estrategiasFacultad],
  );
  const programaById = useMemo(
    () => byId(programasInstitucionales),
    [programasInstitucionales],
  );
  const resultadoById = useMemo(
    () => byId(indicadoresResultado),
    [indicadoresResultado],
  );
  const periodoById = useMemo(() => byId(periodos), [periodos]);
  const metaByIndicatorId = useMemo(
    () =>
      new Map(metas.map((item) => [String(item.id_indicador_producto), item])),
    [metas],
  );
  const avanceByIndicatorId = useMemo(
    () => new Map(avances.map((item) => [String(item.id_indicador), item])),
    [avances],
  );

  const userDependencyId = String(sessionUser?.id_dependencia || "").trim();
  const isSystemUser =
    userDependencyId === "0" || normalize(sessionUser?.permiso) === "sistemas";

  const baseRows = useMemo(() => {
    return indicators.map((indicator) => ({
      ...indicator,
      dependencia: dependenciaById.get(String(indicator.id_dependencia)),
      desafio: desafioById.get(String(indicator.id_desafio)),
      estrategiaConvergente: convergenteById.get(
        String(indicator.id_estrategia_convergente),
      ),
      estrategiaFacultad: facultadById.get(
        String(indicator.id_estrategia_facultad),
      ),
      programaInstitucional: programaById.get(
        String(indicator.id_programa_inst),
      ),
      indicadorResultado: resultadoById.get(
        String(indicator.id_indicador_resultado),
      ),
      periodo: periodoById.get(String(indicator.id_periodo)),
      meta: metaByIndicatorId.get(String(indicator.id)),
      avance: avanceByIndicatorId.get(String(indicator.id)),
    }));
  }, [
    indicators,
    dependenciaById,
    desafioById,
    convergenteById,
    facultadById,
    programaById,
    resultadoById,
    periodoById,
    metaByIndicatorId,
    avanceByIndicatorId,
  ]);

  const visibleRows = useMemo(() => {
    if (isSystemUser || !userDependencyId) return baseRows;
    return baseRows.filter(
      (row) => String(row.id_dependencia || "") === userDependencyId,
    );
  }, [baseRows, isSystemUser, userDependencyId]);

  const filterOptions = useMemo(() => {
    const selectedDesafioIds = filters.desafio
      ? [filters.desafio]
      : desafios.map((item) => String(item.id));
    const selectedConvergenteIds = filters.estrategiaConvergente
      ? [filters.estrategiaConvergente]
      : estrategiasConvergentes
          .filter((item) =>
            selectedDesafioIds.includes(String(item.id_desafio || "")),
          )
          .map((item) => String(item.id));
    const selectedFacultadIds = filters.estrategiaFacultad
      ? [filters.estrategiaFacultad]
      : estrategiasFacultad
          .filter((item) =>
            selectedConvergenteIds.includes(
              String(
                item.id_convergente || item.id_estrategia_convergente || "",
              ),
            ),
          )
          .map((item) => String(item.id));
    const selectedProgramaIds = filters.programaInstitucional
      ? [filters.programaInstitucional]
      : programasInstitucionales
          .filter((item) =>
            selectedFacultadIds.includes(
              String(item.id_estrategia_facultad || ""),
            ),
          )
          .map((item) => String(item.id));
    return {
      dependencias: dependencias,
      desafios: sortById(desafios),
      estrategiasConvergentes: sortById(
        estrategiasConvergentes.filter((item) =>
          selectedDesafioIds.includes(String(item.id_desafio || "")),
        ),
      ),
      estrategiasFacultad: sortById(
        estrategiasFacultad.filter((item) =>
          selectedConvergenteIds.includes(
            String(item.id_convergente || item.id_estrategia_convergente || ""),
          ),
        ),
      ),
      programasInstitucionales: sortById(
        programasInstitucionales.filter((item) =>
          selectedFacultadIds.includes(
            String(item.id_estrategia_facultad || ""),
          ),
        ),
      ),
      indicadoresResultado: sortById(
        indicadoresResultado.filter((item) =>
          selectedProgramaIds.includes(String(item.id_programa_inst || "")),
        ),
      ),
    };
  }, [
    dependencias,
    desafios,
    estrategiasConvergentes,
    estrategiasFacultad,
    programasInstitucionales,
    indicadoresResultado,
    filters.desafio,
    filters.estrategiaConvergente,
    filters.estrategiaFacultad,
    filters.programaInstitucional,
    visibleRows,
  ]);

  const filteredRows = useMemo(() => {
    return visibleRows.filter((row) => {
      if (
        filters.dependencia &&
        String(row.id_dependencia) !== filters.dependencia
      ) {
        return false;
      }
      if (
        filters.tipoDependencia !== "TODAS" &&
        getTipoDependencia(row.dependencia) !== filters.tipoDependencia
      ) {
        return false;
      }
      if (filters.desafio && String(row.id_desafio) !== filters.desafio) {
        return false;
      }
      if (
        filters.estrategiaConvergente &&
        String(row.id_estrategia_convergente) !== filters.estrategiaConvergente
      ) {
        return false;
      }
      if (
        filters.estrategiaFacultad &&
        String(row.id_estrategia_facultad) !== filters.estrategiaFacultad
      ) {
        return false;
      }
      if (
        filters.programaInstitucional &&
        String(row.id_programa_inst) !== filters.programaInstitucional
      ) {
        return false;
      }
      if (
        filters.indicadorResultado &&
        String(row.id_indicador_resultado) !== filters.indicadorResultado
      ) {
        return false;
      }
      return true;
    });
  }, [visibleRows, filters]);

  const resetBelow = (field, next) => {
    const updated = { ...next };
    if (field === "desafio") {
      updated.estrategiaConvergente = "";
      updated.estrategiaFacultad = "";
      updated.programaInstitucional = "";
      updated.indicadorResultado = "";
    }
    if (field === "estrategiaConvergente") {
      updated.estrategiaFacultad = "";
      updated.programaInstitucional = "";
      updated.indicadorResultado = "";
    }
    if (field === "estrategiaFacultad") {
      updated.programaInstitucional = "";
      updated.indicadorResultado = "";
    }
    if (field === "programaInstitucional") {
      updated.indicadorResultado = "";
    }
    return updated;
  };

  const handleFilterChange = (field) => (event) => {
    const value = event.target.value;
    setFilters((prev) => resetBelow(field, { ...prev, [field]: value }));
    setExpandedId(null);
  };

  const updateIndicator = async (id, payload) => {
    setBusyId(String(id));
    setActionError("");
    try {
      await updateSheetRow(SHEET_NAME, id, payload);
      window.location.reload();
    } catch (error) {
      setActionError(
        error?.response?.data?.message || "No se pudo actualizar el indicador.",
      );
    } finally {
      setBusyId("");
    }
  };

  const buildMetaPayload = (indicatorId, payload) => {
    const metaFields = [
      "meta_2025",
      "meta_2026",
      "meta_2027",
      "meta_2028",
      "meta_2029",
      "meta_2030",
    ];
    const metaPayload = {
      id_indicador_producto: String(indicatorId),
    };

    metaFields.forEach((field) => {
      const value = payload?.[field];
      if (value !== "" && value !== undefined && value !== null) {
        metaPayload[field] = Number(value);
      }
    });

    return metaPayload;
  };

  const getCreatedIndicatorId = (responseData) => {
    console.log("Create response data:", responseData);
    if (!responseData) return "";
    if (typeof responseData === "string" || typeof responseData === "number") {
      return String(responseData);
    }
    if (Array.isArray(responseData)) {
      const first = responseData[0];
      console.log("First item in array:", first);
      return String(first?.id ?? first?.insertId ?? first?.insertedId ?? "");
    }
    return String(
      responseData?.id ??
        responseData?.insertId ??
        responseData?.insertedId ??
        responseData?.data?.id ??
        "",
    );
  };

  const createIndicator = async (payload) => {
    setBusyId("create");
    setActionError("");
    try {
      const indicatorResponse = await createSheetRow(SHEET_NAME, payload);
      console.log("Create response:", indicatorResponse);
      const indicatorId = getCreatedIndicatorId(indicatorResponse);
      const metaPayload = buildMetaPayload(indicatorId, payload);
      console.log("Meta payload:", metaPayload);
      if (indicatorId && Object.keys(metaPayload).length > 1) {
        await createSheetRow(META_SHEET_NAME, metaPayload);
        console.log(
          "Meta created for indicator ID:",
          indicatorId,
          "with payload:",
          metaPayload,
        );
      }
      setCreateOpen(false);
      window.location.reload();
    } catch (error) {
      setActionError(
        error?.response?.data?.message || "No se pudo crear el indicador.",
      );
      console.error("Error creating indicator:", error);
      console.log("Payload:", payload);
      console.log("API URL:", import.meta.env.VITE_API_BASE);
    } finally {
      setBusyId("");
    }
  };

  const removeIndicator = async (indicator) => {
    if (!window.confirm(`Eliminar el indicador "${toText(indicator.nombre)}"?`))
      return;
    setBusyId(String(indicator.id));
    setActionError("");
    try {
      await deleteSheetRow(SHEET_NAME, indicator.id);
      setDetailsState({ open: false, indicator: null });
      window.location.reload();
    } catch (error) {
      setActionError(
        error?.response?.data?.message || "No se pudo eliminar el indicador.",
      );
    } finally {
      setBusyId("");
    }
  };

  if (!data) {
    return <Typography sx={{ mt: 2 }}>Cargando informacion...</Typography>;
  }

  return (
    <Box className="indicators-page">
      <Paper className="filters-panel" elevation={1}>
        <Box className="filters-header">
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Indicadores producto
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {filteredRows.length} de {visibleRows.length} indicadores visibles
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            Crear indicador
          </Button>
        </Box>

        <Box className="filters-grid">
          <FormControl size="small" fullWidth>
            <InputLabel>Dependencia</InputLabel>
            <Select
              value={filters.dependencia}
              label="Dependencia"
              onChange={handleFilterChange("dependencia")}
            >
              <MenuItem value="">Todas</MenuItem>
              {filterOptions.dependencias.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.nombre)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Desafio</InputLabel>
            <Select
              value={filters.desafio}
              label="Desafio"
              onChange={handleFilterChange("desafio")}
            >
              <MenuItem value="">Todos</MenuItem>
              {filterOptions.desafios.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.titulo)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Estrategia convergente</InputLabel>
            <Select
              value={filters.estrategiaConvergente}
              label="Estrategia convergente"
              onChange={handleFilterChange("estrategiaConvergente")}
            >
              <MenuItem value="">Todas</MenuItem>
              {filterOptions.estrategiasConvergentes.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.titulo)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Estrategia facultad</InputLabel>
            <Select
              value={filters.estrategiaFacultad}
              label="Estrategia facultad"
              onChange={handleFilterChange("estrategiaFacultad")}
            >
              <MenuItem value="">Todas</MenuItem>
              {filterOptions.estrategiasFacultad.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.titulo)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Programa institucional</InputLabel>
            <Select
              value={filters.programaInstitucional}
              label="Programa institucional"
              onChange={handleFilterChange("programaInstitucional")}
            >
              <MenuItem value="">Todos</MenuItem>
              {filterOptions.programasInstitucionales.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.titulo)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Indicador resultado</InputLabel>
            <Select
              value={filters.indicadorResultado}
              label="Indicador resultado"
              onChange={handleFilterChange("indicadorResultado")}
            >
              <MenuItem value="">Todos</MenuItem>
              {filterOptions.indicadoresResultado.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {toText(item.nombre)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box className="filters-secondary-row">
          <FormControl className="filter-radio-group-block">
            <Typography className="radio-group-title">
              Tipo de dependencia
            </Typography>
            <RadioGroup
              row
              value={filters.tipoDependencia}
              onChange={handleFilterChange("tipoDependencia")}
            >
              <FormControlLabel
                value="TODAS"
                control={<Radio size="small" />}
                label="Todas"
              />
              <FormControlLabel
                value="Oficina"
                control={<Radio size="small" />}
                label="Oficina"
              />
              <FormControlLabel
                value="Escuela"
                control={<Radio size="small" />}
                label="Escuela"
              />
            </RadioGroup>
          </FormControl>
        </Box>
      </Paper>

      <Paper className="indicator-list-header" elevation={1}>
        <Typography className="summary-title" sx={{ fontWeight: 700 }}>
          ID
        </Typography>
        <Typography className="summary-title" sx={{ fontWeight: 700 }}>
          Nombre
        </Typography>
        <Typography
          className="summary-title indicator-summary-dependency"
          sx={{ fontWeight: 700 }}
        >
          Dependencia
        </Typography>
      </Paper>

      {filteredRows.map((indicator) => {
        const isExpanded = expandedId === indicator.id;
        return (
          <Accordion
            key={indicator.id}
            className="indicator-accordion"
            expanded={isExpanded}
            onChange={(_, expanded) =>
              setExpandedId(expanded ? indicator.id : null)
            }
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box className="indicator-summary-grid">
                <Typography sx={{ fontWeight: 700 }}>
                  {toText(indicator.id)}
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {toText(indicator.nombre)}
                </Typography>
                <Typography
                  sx={{ fontWeight: 700 }}
                  className="indicator-summary-dependency"
                >
                  {toText(indicator.dependencia?.nombre)}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box className="indicator-detail-grid">
                <Paper className="detail-item" elevation={0}>
                  <Typography className="detail-label">Desafio</Typography>
                  <Typography className="detail-value">
                    {toText(indicator.desafio?.titulo)}
                  </Typography>
                </Paper>
                <Paper className="detail-item" elevation={0}>
                  <Typography className="detail-label">
                    Estrategia convergente
                  </Typography>
                  <Typography className="detail-value">
                    {toText(indicator.estrategiaConvergente?.titulo)}
                  </Typography>
                </Paper>
                <Paper className="detail-item" elevation={0}>
                  <Typography className="detail-label">
                    Estrategia facultad
                  </Typography>
                  <Typography className="detail-value">
                    {toText(indicator.estrategiaFacultad?.titulo)}
                  </Typography>
                </Paper>
                <Paper className="detail-item" elevation={0}>
                  <Typography className="detail-label">
                    Programa institucional
                  </Typography>
                  <Typography className="detail-value">
                    {toText(indicator.programaInstitucional?.titulo)}
                  </Typography>
                </Paper>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 1,
                  mt: 2,
                  flexWrap: "wrap",
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => setDetailsState({ open: true, indicator })}
                >
                  Ver detalles
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setEditState({ open: true, indicator })}
                >
                  Editar
                </Button>
                <Button
                  color="error"
                  variant="outlined"
                  onClick={() => removeIndicator(indicator)}
                >
                  Eliminar
                </Button>
              </Box>
              <TableContainer
                component={Paper}
                sx={{ mt: 2 }}
                variant="outlined"
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Concepto</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>2026</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        Total trienio
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Meta</TableCell>
                      <TableCell>{toText(indicator.meta?.tipo)}</TableCell>
                      <TableCell>{toText(indicator.meta?.meta_2026)}</TableCell>
                      <TableCell>
                        {toText(indicator.meta?.total_trienio)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Avance</TableCell>
                      <TableCell>Porcentaje</TableCell>
                      <TableCell>
                        {toText(indicator.avance?.avance_2026)}
                      </TableCell>
                      <TableCell>
                        {toText(indicator.avance?.total_trienio || "-")}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ mt: 2 }}>
                <Typography className="detail-label">
                  URL documento evidencia
                </Typography>
                <Typography className="detail-value">
                  {toText(indicator.meta?.url || indicator.avance?.url || "")}
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}

      {!filteredRows.length && (
        <Paper className="empty-filters-state" elevation={0}>
          <Typography>
            No se encontraron indicadores con los filtros seleccionados.
          </Typography>
        </Paper>
      )}

      {actionError && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography color="error">{actionError}</Typography>
        </Paper>
      )}

      <CreateIndicator
        open={createOpen}
        loading={busyId === "create"}
        dependencias={dependencias}
        desafios={desafios}
        estrategiasConvergentes={estrategiasConvergentes}
        estrategiasFacultad={estrategiasFacultad}
        programasInstitucionales={programasInstitucionales}
        indicadoresResultado={indicadoresResultado}
        periodos={periodos}
        metas={metas}
        onClose={() => setCreateOpen(false)}
        onSubmit={createIndicator}
      />

      <EditModal
        open={editState.open}
        loading={busyId === String(editState.indicator?.id)}
        indicator={editState.indicator}
        dependencias={dependencias}
        desafios={desafios}
        estrategiasConvergentes={estrategiasConvergentes}
        estrategiasFacultad={estrategiasFacultad}
        programasInstitucionales={programasInstitucionales}
        indicadoresResultado={indicadoresResultado}
        metas={metas}
        periodos={[]}
        onClose={() => setEditState({ open: false, indicator: null })}
        onSubmit={(payload) => updateIndicator(editState.indicator.id, payload)}
      />

      <ModalDetails
        open={detailsState.open}
        indicator={detailsState.indicator}
        dependencias={dependencias}
        desafios={desafios}
        estrategiasConvergentes={estrategiasConvergentes}
        estrategiasFacultad={estrategiasFacultad}
        programasInstitucionales={programasInstitucionales}
        indicadoresResultado={indicadoresResultado}
        periodos={periodos}
        onClose={() => setDetailsState({ open: false, indicator: null })}
      />
    </Box>
  );
};

export default IndicatorsPage;
