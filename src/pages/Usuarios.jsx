import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
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
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { createSheetRow, deleteSheetRow, updateSheetRow } from "../api/api";

const toText = (value) => String(value ?? "").trim() || "No disponible";
const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const sortById = (items) =>
  [...items].sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));

const getTipoDependencia = (dependencia) => {
  const value = normalize(dependencia?.tipo);
  if (value === "escuela") return "Escuela";
  if (value === "oficina") return "Oficina";
  return "No definido";
};

const getSheet = (data, ...keys) => {
  for (const key of keys) {
    const value = data?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const isPrivilegedRole = (role) => {
  const value = normalize(role);
  return value === "administrador" || value === "sistemas";
};

function Usuarios({ data, userInfo }) {
  const [users, setUsers] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterTipoDependencia, setFilterTipoDependencia] = useState("TODAS");
  const [form, setForm] = useState({
    correo: "",
    id_dependencia: "",
  });
  const [editForm, setEditForm] = useState({
    id: "",
    correo: "",
    id_dependencia: "",
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [atTooltipOpen, setAtTooltipOpen] = useState(false);
  const atTooltipTimerRef = useRef(null);

  useEffect(() => {
    setUsers(sortById(getSheet(data, "USUARIOS")));
    setDependencies(sortById(getSheet(data, "DEPENDENCIA", "DEPENDENCIAS")));
  }, [data]);

  useEffect(() => {
    return () => {
      if (atTooltipTimerRef.current) {
        clearTimeout(atTooltipTimerRef.current);
      }
    };
  }, []);

  const role = normalize(userInfo?.rol || userInfo?.permiso);
  const canManageUsers = isPrivilegedRole(role);

  const dependencyById = useMemo(
    () => new Map(dependencies.map((item) => [String(item.id), item])),
    [dependencies],
  );

  const filteredUsers = useMemo(() => {
    if (filterTipoDependencia === "TODAS") return users;
    return users.filter((user) => {
      const dep = dependencyById.get(String(user.id_dependencia));
      return getTipoDependencia(dep) === filterTipoDependencia;
    });
  }, [users, filterTipoDependencia, dependencyById]);

  const resetForm = () => {
    setForm({
      correo: "",
      id_dependencia: "",
    });
  };

  const handleOpen = () => {
    setError("");
    setSuccess("");
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setError("");
    setSuccess("");
  };

  const closeEditDialog = () => {
    setEditOpen(false);
    setSelectedUser(null);
    setEditForm({
      id: "",
      correo: "",
      id_dependencia: "",
    });
    setError("");
  };

  const closeDeleteDialog = () => {
    setDeleteOpen(false);
    setSelectedUser(null);
    setError("");
  };

  const showAtTooltip = () => {
    setAtTooltipOpen(true);
    if (atTooltipTimerRef.current) {
      clearTimeout(atTooltipTimerRef.current);
    }
    atTooltipTimerRef.current = setTimeout(() => {
      setAtTooltipOpen(false);
    }, 2500);
  };

  const handleChange = (field) => (event) => {
    let value = event.target.value;
    if (field === "correo") {
      if (/@/.test(value)) {
        showAtTooltip();
      }
      value = value.replace(/@/g, "");
    }
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCorreoKeyDown = (event) => {
    if (event.key === "@") {
      event.preventDefault();
      showAtTooltip();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const localPart = String(form.correo || "").trim();
      const fullEmail = `${localPart}@correounivalle.edu.co`;
      if (!localPart || !form.id_dependencia) {
        throw new Error("Completa correo y dependencia.");
      }

      const response = await createSheetRow("USUARIOS", {
        id_dependencia: String(form.id_dependencia),
        correo: fullEmail,
        rol: "usuario",
      });

      const createdId = String(
        response?.id ?? response?.data?.id ?? response?.insertId ?? "",
      );

      setUsers((prev) =>
        sortById([
          ...prev,
          {
            id: createdId || String(Date.now()),
            id_dependencia: String(form.id_dependencia),
            correo: fullEmail,
            rol: "usuario",
          },
        ]),
      );
      setSuccess("Usuario creado correctamente.");
      resetForm();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "No se pudo crear el usuario.",
      );
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (user) => {
    setError("");
    setSuccess("");
    setSelectedUser(user);
    setEditForm({
      id: String(user?.id ?? ""),
      correo: String(user?.correo ?? "").replace(
        /@correounivalle\.edu\.co$/i,
        "",
      ),
      id_dependencia: String(user?.id_dependencia ?? ""),
    });
    setEditOpen(true);
  };

  const handleEditChange = (field) => (event) => {
    let value = event.target.value;
    if (field === "correo") {
      if (/@/.test(value)) {
        showAtTooltip();
      }
      value = value.replace(/@/g, "");
    }
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditSave = async () => {
    setEditLoading(true);
    setError("");
    setSuccess("");
    try {
      const localPart = String(editForm.correo || "").trim();
      const fullEmail = `${localPart}@correounivalle.edu.co`;
      if (!localPart || !editForm.id_dependencia) {
        throw new Error("Completa correo y dependencia.");
      }

      await updateSheetRow("USUARIOS", editForm.id, {
        correo: fullEmail,
        id_dependencia: String(editForm.id_dependencia),
      });

      setUsers((prev) =>
        sortById(
          prev.map((user) =>
            String(user.id) === String(editForm.id)
              ? {
                  ...user,
                  correo: fullEmail,
                  id_dependencia: String(editForm.id_dependencia),
                }
              : user,
          ),
        ),
      );
      setSuccess("Usuario actualizado correctamente.");
      closeEditDialog();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "No se pudo actualizar el usuario.",
      );
    } finally {
      setEditLoading(false);
    }
  };

  const openDeleteDialog = (user) => {
    setError("");
    setSuccess("");
    setSelectedUser(user);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedUser?.id) return;
    setDeleteLoading(true);
    setError("");
    setSuccess("");
    try {
      await deleteSheetRow("USUARIOS", selectedUser.id);
      setUsers((prev) =>
        prev.filter((user) => String(user.id) !== String(selectedUser.id)),
      );
      setSuccess("Usuario eliminado correctamente.");
      closeDeleteDialog();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "No se pudo eliminar el usuario.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!canManageUsers) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Gestión de Usuarios
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          No tienes permisos para ver esta sección.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ py: 2 }}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Gestión de Usuarios
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              Administra los usuarios del sistema.
            </Typography>
            <FormControl>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, mt: 2  }}>
            Tipo de dependencia
          </Typography>
          <RadioGroup
            row
            value={filterTipoDependencia}
            onChange={(e) => setFilterTipoDependencia(e.target.value)}
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
          <Button variant="contained" onClick={handleOpen}>
            Crear usuario
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Correo</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Dependencia</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Rol</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{toText(user.id)}</TableCell>
                <TableCell>{toText(user.correo)}</TableCell>
                <TableCell>
                  {toText(
                    dependencyById.get(String(user.id_dependencia))?.nombre,
                  )}
                </TableCell>
                <TableCell>{toText(user.rol)}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar usuario">
                    <IconButton
                      size="small"
                      onClick={() => openEditDialog(user)}
                      sx={{ mr: 0.5 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar usuario">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => openDeleteDialog(user)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Crear usuario</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 2 }}>
            <Tooltip
              open={atTooltipOpen}
              title="El @ ya está puesto"
              placement="top"
              arrow
            >
              <TextField
                fullWidth
                label="Correo"
                helperText="@correounivalle.edu.co se agrega automáticamente"
                value={form.correo}
                onChange={handleChange("correo")}
                onKeyDown={handleCorreoKeyDown}
                InputProps={{
                  sx: {
                    position: "relative",
                    "& input": {
                      width: "48%",
                      minWidth: "48%",
                      textAlign:"right",
                      fontSize:"1.3rem",
                    },
                  },
                  endAdornment: (
                    <Box
                      component="span"
                      sx={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "text.secondary",
                        fontSize: "1.3rem",
                        pointerEvents: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      @correounivalle.edu.co
                    </Box>
                  ),
                }}
              />
            </Tooltip>
            <FormControl fullWidth>
              <InputLabel>Dependencia</InputLabel>
              <Select
                value={form.id_dependencia}
                label="Dependencia"
                onChange={handleChange("id_dependencia")}
              >
                <MenuItem value="">Seleccione una dependencia</MenuItem>
                {dependencies.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {toText(item.nombre)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cerrar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={loading}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={closeEditDialog} fullWidth maxWidth="sm">
        <DialogTitle>Editar usuario</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 2 }}>
            <TextField fullWidth label="ID" value={editForm.id} disabled />
            <Tooltip
              open={atTooltipOpen}
              title="El @ ya está puesto"
              placement="top"
              arrow
            >
              <TextField
                fullWidth
                label="Correo"
                helperText="@correounivalle.edu.co se agrega automáticamente"
                value={editForm.correo}
                onChange={handleEditChange("correo")}
                onKeyDown={handleCorreoKeyDown}
                InputProps={{
                  sx: {
                    position: "relative",
                    "& input": {
                      width: "48%",
                      minWidth: "48%",
                      textAlign: "right",
                      fontSize: "1.3rem",
                    },
                  },
                  endAdornment: (
                    <Box
                      component="span"
                      sx={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "text.secondary",
                        fontSize: "1.3rem",
                        pointerEvents: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      @correounivalle.edu.co
                    </Box>
                  ),
                }}
              />
            </Tooltip>
            <FormControl fullWidth>
              <InputLabel>Dependencia</InputLabel>
              <Select
                value={editForm.id_dependencia}
                label="Dependencia"
                onChange={handleEditChange("id_dependencia")}
              >
                <MenuItem value="">Seleccione una dependencia</MenuItem>
                {dependencies.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {toText(item.nombre)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleEditSave}
            disabled={editLoading}
          >
            Guardar cambios
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={closeDeleteDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Eliminar usuario</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            ¿Seguro que deseas eliminar a{" "}
            <strong>{toText(selectedUser?.correo)}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleteLoading}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Usuarios;
