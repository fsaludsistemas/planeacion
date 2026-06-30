import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  Input,
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
  TextField,
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
const EVIDENCES_SHEET_NAME = "EVIDENCIAS";
const EVIDENCE_URL_FIELD = "url_documento_evidencia";
const EVIDENCE_YEAR = 2026;
const USERS_SHEET_NAME = "USUARIOS";
const toText = (value) => String(value ?? "").trim() || "No disponible";
const normalizeRole = (value) => normalize(value);
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

const matchesRespondeAFilter = (idRespondeA, filterValue, respondeAById) => {
  if (!filterValue) return true;
  const item = respondeAById.get(String(idRespondeA));
  return normalize(item?.nombre) === normalize(filterValue);
};

const isGoogleSheetsUrl = (value) => {
  const url = String(value ?? "").trim();
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "docs.google.com" &&
      parsed.pathname.includes("/spreadsheets/d/")
    );
  } catch {
    return false;
  }
};

const IndicatorsPage = ({ data, userInfo }) => {
  const [filters, setFilters] = useState({
    dependencia: "",
    tipoDependencia: "TODAS",
    respondeA: "",
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
  const [evidenceUrls, setEvidenceUrls] = useState({});
  const [logroValues, setLogroValues] = useState({});
  const logroSaveTimersRef = useRef({});

  useEffect(() => {
    return () => {
      Object.values(logroSaveTimersRef.current).forEach((timerId) => {
        if (timerId) clearTimeout(timerId);
      });
    };
  }, []);

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
  const usuarios = useMemo(
    () => sortById(getSheet(data, USERS_SHEET_NAME)),
    [data],
  );
  const dependencias = useMemo(
    () => sortById(getSheet(data, "DEPENDENCIA", "DEPENDENCIAS")),
    [data],
  );
  const respondeAs = useMemo(
    () => sortById(getSheet(data, "RESPONDE_A")),
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
  const evidencias = useMemo(
    () => sortById(getSheet(data, EVIDENCES_SHEET_NAME)),
    [data],
  );

  const byId = (items) => new Map(items.map((item) => [String(item.id), item]));
  const dependenciaById = useMemo(() => byId(dependencias), [dependencias]);
  const respondeAById = useMemo(() => byId(respondeAs), [respondeAs]);
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
  const evidenciaByIndicatorId = useMemo(
    () =>
      new Map(
        evidencias.map((item) => [String(item.id_indicador_producto), item]),
      ),
    [evidencias],
  );
  const nextEvidenceId = useMemo(() => {
    const maxId = evidencias.reduce((max, item) => {
      const current = Number(item?.id ?? 0);
      return Number.isFinite(current) && current > max ? current : max;
    }, 0);
    return String(maxId + 1);
  }, [evidencias]);
  const userById = useMemo(
    () => new Map(usuarios.map((item) => [String(item.id), item])),
    [usuarios],
  );

  const userDependencyId = String(sessionUser?.id_dependencia || "").trim();
  const userRole = normalizeRole(sessionUser?.rol || sessionUser?.permiso);
  const isAdminOrSystems =
    userDependencyId === "0" ||
    userRole === "sistemas" ||
    userRole === "administrador";
  const isRegularUser = userRole === "usuario";

  const baseRows = useMemo(() => {
    return indicators.map((indicator) => ({
      ...indicator,
      dependencia: dependenciaById.get(String(indicator.id_dependencia)),
      respondeA: respondeAById.get(String(indicator.id_responde_a)),
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
      responsableUsuario: userById.get(String(indicator.responsable)),
    }));
  }, [
    indicators,
    dependenciaById,
    respondeAById,
    desafioById,
    convergenteById,
    facultadById,
    programaById,
    resultadoById,
    periodoById,
    metaByIndicatorId,
    avanceByIndicatorId,
    userById,
  ]);

  const visibleRows = useMemo(() => {
    if (isAdminOrSystems || !userDependencyId) return baseRows;
    return baseRows.filter(
      (row) => String(row.id_dependencia || "") === userDependencyId,
    );
  }, [baseRows, isAdminOrSystems, userDependencyId]);

  const filterOptions = useMemo(() => {
    const scopedRows =
      filters.tipoDependencia === "TODAS"
        ? visibleRows
        : visibleRows.filter(
            (row) =>
              getTipoDependencia(row.dependencia) === filters.tipoDependencia,
          );
    const dependencyIds = new Set(
      scopedRows.map((row) => String(row.id_dependencia || "")),
    );
    const respondeAIds = new Set(
      scopedRows.map((row) => String(row.id_responde_a || "")),
    );
    const desafioIds = new Set(
      scopedRows.map((row) => String(row.id_desafio || "")),
    );

    const convergenteScopeRows = filters.desafio
      ? scopedRows.filter(
          (row) => String(row.id_desafio || "") === filters.desafio,
        )
      : scopedRows;
    const convergenteIds = new Set(
      convergenteScopeRows.map((row) =>
        String(row.id_estrategia_convergente || ""),
      ),
    );
    const facultadScopeRows = filters.estrategiaConvergente
      ? scopedRows.filter(
          (row) =>
            String(row.id_estrategia_convergente || "") ===
            filters.estrategiaConvergente,
        )
      : convergenteScopeRows;
    const facultadIds = new Set(
      facultadScopeRows.map((row) => String(row.id_estrategia_facultad || "")),
    );
    const programaScopeRows = filters.estrategiaFacultad
      ? scopedRows.filter(
          (row) =>
            String(row.id_estrategia_facultad || "") ===
            filters.estrategiaFacultad,
        )
      : facultadScopeRows;
    const resultScopeRows = filters.programaInstitucional
      ? scopedRows.filter(
          (row) =>
            String(row.id_programa_inst || "") ===
            filters.programaInstitucional,
        )
      : programaScopeRows;
    const programaIds = new Set(
      programaScopeRows.map((row) => String(row.id_programa_inst || "")),
    );
    return {
      dependencias: sortById(
        dependencias.filter((item) => dependencyIds.has(String(item.id))),
      ),
      respondeAs: sortById(
        respondeAs.filter((item) => respondeAIds.has(String(item.id))),
      ),
      desafios: sortById(
        desafios.filter((item) => desafioIds.has(String(item.id))),
      ),
      estrategiasConvergentes: sortById(
        estrategiasConvergentes.filter((item) =>
          convergenteIds.has(String(item.id)),
        ),
      ),
      estrategiasFacultad: sortById(
        estrategiasFacultad.filter((item) => facultadIds.has(String(item.id))),
      ),
      programasInstitucionales: sortById(
        programasInstitucionales.filter((item) =>
          programaIds.has(String(item.id)),
        ),
      ),
      indicadoresResultado: sortById(
        indicadoresResultado.filter((item) =>
          resultScopeRows.some(
            (row) =>
              String(row.id_indicador_resultado || "") === String(item.id),
          ),
        ),
      ),
    };
  }, [
    visibleRows,
    dependencias,
    desafios,
    respondeAs,
    estrategiasConvergentes,
    estrategiasFacultad,
    programasInstitucionales,
    indicadoresResultado,
    filters.tipoDependencia,
    filters.desafio,
    filters.estrategiaConvergente,
    filters.estrategiaFacultad,
    filters.programaInstitucional,
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
      if (
        !matchesRespondeAFilter(
          row.id_responde_a,
          filters.respondeA,
          respondeAById,
        )
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
  }, [visibleRows, filters, respondeAById]);

  const clearFilters = () => {
    setFilters({
      dependencia: "",
      tipoDependencia: "TODAS",
      respondeA: "",
      desafio: "",
      estrategiaConvergente: "",
      estrategiaFacultad: "",
      programaInstitucional: "",
      indicadorResultado: "",
    });
    setExpandedId(null);
  };

  const resetBelow = (field, next) => {
    const updated = { ...next };
    if (field === "tipoDependencia") {
      updated.dependencia = "";
    }
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

  const updateIndicator = async (id, payload, { reload = true } = {}) => {
    setBusyId(String(id));
    setActionError("");
    try {
      await updateSheetRow(SHEET_NAME, id, payload);
      if (reload) {
        window.location.reload();
      }
    } catch (error) {
      setActionError(
        error?.response?.data?.message || "No se pudo actualizar el indicador.",
      );
    } finally {
      setBusyId("");
    }
  };

  const canEditAllIndicators = isAdminOrSystems;
  const currentUserId = String(sessionUser?.id || "");
  const isIndicatorOwnedByUser = (indicator) =>
    String(indicator.responsable || "") === currentUserId;

  const getEvidenceUrl = (indicator) => {
    const storedValue = evidenceUrls[String(indicator.id)];
    if (storedValue !== undefined) return storedValue;
    const evidencia = evidenciaByIndicatorId.get(String(indicator.id));
    const yearKey = `url_${EVIDENCE_YEAR}`;
    return String(
      evidencia?.[yearKey] ??
        indicator?.[EVIDENCE_URL_FIELD] ??
        indicator?.urlDocumentoEvidencia ??
        "",
    );
  };

  const handleEvidenceUrlChange = (indicatorId) => (event) => {
    const value = event.target.value;
    setEvidenceUrls((prev) => ({
      ...prev,
      [String(indicatorId)]: value,
    }));
  };

  const handleEvidenceUrlBlur = (indicator) => async () => {
    const nextValue = getEvidenceUrl(indicator).trim();
    if (!nextValue) return;

    if (!isGoogleSheetsUrl(nextValue)) {
      setActionError("La URL de evidencia debe ser un enlace de Google Sheets.");
      return;
    }
  };

  const handleLinkEvidence = async (indicator) => {
    const nextValue = getEvidenceUrl(indicator).trim();
    if (!nextValue) {
      setActionError("Escribe una URL antes de vincularla.");
      return;
    }

    if (!isGoogleSheetsUrl(nextValue)) {
      setActionError("La URL de evidencia debe ser un enlace de Google Sheets.");
      return;
    }

    setBusyId(`evidence-${indicator.id}`);
    setActionError("");
    try {
      const yearKey = `url_${EVIDENCE_YEAR}`;
      const evidenceRow = evidenciaByIndicatorId.get(String(indicator.id));
      const payload = {
        id: evidenceRow?.id ?? nextEvidenceId,
        id_indicador_producto: String(indicator.id),
        [yearKey]: nextValue,
      };

      if (evidenceRow?.id) {
        await updateSheetRow(EVIDENCES_SHEET_NAME, evidenceRow.id, payload);
      } else {
        await createSheetRow(EVIDENCES_SHEET_NAME, payload);
      }
      window.location.reload();
    } catch (error) {
      setActionError(
        error?.response?.data?.message ||
          "No se pudo vincular la URL de evidencia.",
      );
    } finally {
      setBusyId("");
    }
  };

  const getLogroValue = (indicator) => {
    const storedValue = logroValues[String(indicator.id)];
    if (storedValue !== undefined) return storedValue;
    return String(indicator?.logro ?? "");
  };

  const handleLogroChange = (indicatorId) => (event) => {
    const value = event.target.value;
    setLogroValues((prev) => ({
      ...prev,
      [String(indicatorId)]: value,
    }));

    const timerKey = String(indicatorId);
    if (logroSaveTimersRef.current[timerKey]) {
      clearTimeout(logroSaveTimersRef.current[timerKey]);
    }
    logroSaveTimersRef.current[timerKey] = setTimeout(() => {
      void (async () => {
        try {
          const nextValue = String(value ?? "").trim();
          if (!nextValue) {
            await updateIndicator(
              indicatorId,
              { logro: "" },
              { reload: false },
            );
            return;
          }
          await updateIndicator(
            indicatorId,
            { logro: nextValue },
            { reload: false },
          );
        } finally {
          delete logroSaveTimersRef.current[timerKey];
        }
      })();
    }, 900);
  };

  const handleLogroBlur = (indicator) => async () => {
    const timerKey = String(indicator.id);
    if (logroSaveTimersRef.current[timerKey]) {
      clearTimeout(logroSaveTimersRef.current[timerKey]);
      delete logroSaveTimersRef.current[timerKey];
    }
    const nextValue = getLogroValue(indicator).trim();
    const currentValue = String(indicator?.logro ?? "").trim();

    if (nextValue === currentValue) return;

    await updateIndicator(
      indicator.id,
      {
        logro: nextValue,
      },
      { reload: false },
    );
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
      const indicatorPayload = { ...payload };
      indicatorPayload.suma_facultad =
        indicatorPayload.suma_facultad === true ||
        String(indicatorPayload.suma_facultad).toLowerCase() === "true";
      const shouldCreateRespondeA = Boolean(indicatorPayload.create_responde_a);
      const respondeAName = String(
        indicatorPayload.responde_a_nombre ?? "",
      ).trim();

      if (shouldCreateRespondeA) {
        if (!respondeAName) {
          throw new Error("Debes escribir el nombre de RESPONDE_A.");
        }
        const respondeAResponse = await createSheetRow("RESPONDE_A", {
          nombre: respondeAName,
        });
        const respondeAId = getCreatedIndicatorId(respondeAResponse);
        if (respondeAId) {
          indicatorPayload.id_responde_a = respondeAId;
        }
      }

      delete indicatorPayload.create_responde_a;
      delete indicatorPayload.responde_a_nombre;

      const indicatorResponse = await createSheetRow(
        SHEET_NAME,
        indicatorPayload,
      );
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
          {canEditAllIndicators && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
            >
              Crear indicador
            </Button>
          )}
          <Button variant="outlined" onClick={clearFilters}>
            Limpiar filtros
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
          <FormControl className="filter-radio-group-block">
            <Typography className="radio-group-title">Responde a</Typography>
            <RadioGroup
              row
              value={filters.respondeA}
              onChange={handleFilterChange("respondeA")}
            >
              <FormControlLabel
                value=""
                control={<Radio size="small" />}
                label="Todas"
              />
              <FormControlLabel
                value="MT"
                control={<Radio size="small" />}
                label="MT"
              />
              <FormControlLabel
                value="CNA"
                control={<Radio size="small" />}
                label="CNA"
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
        <Typography
          className="summary-title indicator-summary-dependency"
          sx={{ fontWeight: 700 }}
        >
          Avance
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
              <Box
                className="indicator-summary-grid"
                sx={{
                  bgcolor: isIndicatorOwnedByUser(indicator)
                    ? "grey.800"
                    : "transparent",
                  color: isIndicatorOwnedByUser(indicator)
                    ? "common.white"
                    : "inherit",
                  borderRadius: 1,
                  px: 1,
                  py: 0.5,
                }}
              >
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
                <Typography
                  sx={{ fontWeight: 700 }}
                  className="indicator-summary-dependency"
                >
                  {toText(indicator.avance?.avance_2026) || "-"}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer
                component={Paper}
                sx={{ mt: 2 }}
                variant="outlined"
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900, fontSize: "15px" }}>
                        Concepto
                      </TableCell>
                      <TableCell sx={{ fontWeight: 900, fontSize: "15px" }}>
                        Tipo
                      </TableCell>
                      <TableCell sx={{ fontWeight: 900, fontSize: "15px" }}>
                        2026
                      </TableCell>
                      <TableCell sx={{ fontWeight: 900, fontSize: "15px" }}>
                        Total trienio
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900, fontSize: "15px" }}>
                        Meta
                      </TableCell>
                      <TableCell sx={{ fontSize: "15px" }}>
                        {toText(indicator.meta?.tipo)}
                      </TableCell>
                      <TableCell sx={{ fontSize: "15px" }}>
                        {toText(indicator.meta?.meta_2026)}
                      </TableCell>
                      <TableCell sx={{ fontSize: "15px" }}>
                        {toText(indicator.meta?.total_trienio)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900, fontSize: "15px" }}>
                        Avance
                      </TableCell>
                      <TableCell sx={{ fontSize: "15px" }}>
                        Porcentaje
                      </TableCell>
                      <TableCell sx={{ fontSize: "15px" }}>
                        {toText(indicator.avance?.avance_2026)}
                      </TableCell>
                      <TableCell sx={{ fontSize: "15px" }}>
                        {toText(indicator.avance?.total_trienio || "-")}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <Box
                sx={{
                  mt: 2,
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 2,
                  alignItems: "start",
                }}
              >
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Typography className="detail-label" sx={{ mb: 1 }}>
                    URL documento evidencia
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="URL del documento de evidencia"
                      value={getEvidenceUrl(indicator)}
                      onChange={handleEvidenceUrlChange(indicator.id)}
                      onBlur={handleEvidenceUrlBlur(indicator)}
                    />
                    <Button
                      variant="contained"
                      onClick={() => handleLinkEvidence(indicator)}
                      disabled={busyId === `evidence-${indicator.id}`}
                    >
                      Vincular
                    </Button>
                  </Box>
                </Box>
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Typography className="detail-label" sx={{ mb: 1 }}>
                    Descripción de Logro
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={4}
                    placeholder="Logro"
                    value={getLogroValue(indicator)}
                    onChange={handleLogroChange(indicator.id)}
                    onBlur={handleLogroBlur(indicator)}
                  />
                </Box>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 1,
                  mt: 2,
                  mb: 2,
                  flexWrap: "wrap",
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => setDetailsState({ open: true, indicator })}
                >
                  Ver detalles
                </Button>
                {canEditAllIndicators ? (
                  <>
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
                  </>
                ) : null}
              </Box>
              <Box className="indicator-detail-grid">
                <Paper
                  className="detail-item"
                  elevation={0}
                  size="small"
                  sx={{ p: 1, minHeight: "auto" }}
                >
                  <Typography className="detail-label">Desafio</Typography>
                  <Typography
                    className="detail-value"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2, // Cambia a 2 o más si quieres permitir más líneas antes del corte
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {toText(indicator.desafio?.titulo)}
                  </Typography>
                </Paper>
                <Paper
                  className="detail-item"
                  elevation={0}
                  size="small"
                  sx={{ p: 1, minHeight: "auto" }}
                >
                  <Typography className="detail-label">
                    Estrategia convergente
                  </Typography>
                  <Typography
                    className="detail-value"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2, // Cambia a 2 o más si quieres permitir más líneas antes del corte
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {toText(indicator.estrategiaConvergente?.titulo)}
                  </Typography>
                </Paper>
                <Paper
                  className="detail-item"
                  elevation={0}
                  size="small"
                  sx={{ p: 1, minHeight: "auto" }}
                >
                  <Typography className="detail-label">
                    Estrategia facultad
                  </Typography>
                  <Typography
                    className="detail-value"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2, // Cambia a 2 o más si quieres permitir más líneas antes del corte
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {toText(indicator.estrategiaFacultad?.titulo)}
                  </Typography>
                </Paper>
                <Paper
                  className="detail-item"
                  elevation={0}
                  size="small"
                  sx={{ p: 1, minHeight: "auto" }}
                >
                  <Typography className="detail-label">
                    Programa institucional
                  </Typography>
                  <Typography
                    className="detail-value"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2, // Cambia a 2 o más si quieres permitir más líneas antes del corte
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {toText(indicator.programaInstitucional?.titulo)}
                  </Typography>
                </Paper>
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
        respondeAs={respondeAs}
        usuarios={usuarios}
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
        respondeAs={respondeAs}
        usuarios={usuarios}
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
        respondeAs={respondeAs}
        usuarios={usuarios}
        periodos={periodos}
        onClose={() => setDetailsState({ open: false, indicator: null })}
      />
    </Box>
  );
};

export default IndicatorsPage;
