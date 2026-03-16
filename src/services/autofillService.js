import axios from 'axios';
import authService from './authService';
import _API_BASE_URL from '../config';

const API_BASE_URL = _API_BASE_URL + '/api';

// Create axios instance with default auth headers
const createAuthAxios = () => {
    const instance = axios.create({
        baseURL: API_BASE_URL,
    });

    // Add request interceptor to include auth headers
    instance.interceptors.request.use(
        (config) => {
            const authHeaders = authService.getAuthHeaders();
            config.headers = {
                ...config.headers,
                ...authHeaders,
            };
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    return instance;
};

const autofillService = {
    // Fetch all autofill data in parallel
    async getAllAutofillData() {
        try {
            const authAxios = createAuthAxios();

            const [
                zMovements,
                years,
                yMovements,
                xMovements,
                types,
                takimSayisis,
                takimOlcmeProbus,
                statuses,
                serialNumbers,
                parcaOlcmeProbus,
                operatingSystems,
                operatingSystemOthers,
                netWeights,
                models,
                maxMaterialWeights,
                makes,
                machineWidths,
                machineNames,
                machineModels,
                machineLengths,
                machineHeights,
                holderTypes,
                // New endpoints
                konveyors,
                additionalEquipments,
                anahtarBilgisis,
                rpms,
                hoursOperateds,
                aMovements,
                bMovements,
                cMovements,
                ictenSuVermes,
                kagitFiltres,
                conditions,
                additionalWeights,
                machineOrigins,
                machinePowers
            ] = await Promise.all([
                authAxios.get('/autofill/zMovement'),
                authAxios.get('/autofill/year'),
                authAxios.get('/autofill/yMovement'),
                authAxios.get('/autofill/xMovement'),
                authAxios.get('/autofill/type'),
                authAxios.get('/autofill/takimSayisi'),
                authAxios.get('/autofill/takimOlcmeProbu'),
                authAxios.get('/autofill/status'),
                authAxios.get('/autofill/serialNumber'),
                authAxios.get('/autofill/parcaOlcmeProbu'),
                authAxios.get('/autofill/operatingSystem'),
                authAxios.get('/autofill/operatingSystemOther'),
                authAxios.get('/autofill/netWeight'),
                authAxios.get('/autofill/model'),
                authAxios.get('/autofill/maxMaterialWeight'),
                authAxios.get('/autofill/make'),
                authAxios.get('/autofill/machineWidth'),
                authAxios.get('/autofill/machineName'),
                authAxios.get('/autofill/machineModel'),
                authAxios.get('/autofill/machineLength'),
                authAxios.get('/autofill/machineHeight'),
                authAxios.get('/autofill/holderType'),
                // New endpoints
                authAxios.get('/autofill/konveyor'),
                authAxios.get('/autofill/additionalEquipment'),
                authAxios.get('/autofill/anahtarBilgisi'),
                authAxios.get('/autofill/rpm'),
                authAxios.get('/autofill/hoursOperated'),
                authAxios.get('/autofill/aMovement'),
                authAxios.get('/autofill/bMovement'),
                authAxios.get('/autofill/cMovement'),
                authAxios.get('/autofill/ictenSuVerme'),
                authAxios.get('/autofill/kagitFiltre'),
                authAxios.get('/autofill/condition'),
                authAxios.get('/autofill/additionalWeight'),
                authAxios.get('/autofill/machineOrigin'),
                authAxios.get('/autofill/machinePower')
            ]);

            // Helper function to ensure we get an array of strings
            const ensureStringArray = (response) => {
                const data = response.data;
                console.log('Raw API response:', data);
                if (!data) return [];
                if (Array.isArray(data)) return data.filter(item => item != null).map(item => String(item));
                return [];
            };

            const result = {
                zMovements: ensureStringArray(zMovements),
                years: ensureStringArray(years),
                yMovements: ensureStringArray(yMovements),
                xMovements: ensureStringArray(xMovements),
                types: ensureStringArray(types),
                takimSayisis: ensureStringArray(takimSayisis),
                takimOlcmeProbus: ensureStringArray(takimOlcmeProbus),
                statuses: ensureStringArray(statuses),
                serialNumbers: ensureStringArray(serialNumbers),
                parcaOlcmeProbus: ensureStringArray(parcaOlcmeProbus),
                operatingSystems: ensureStringArray(operatingSystems),
                operatingSystemOthers: ensureStringArray(operatingSystemOthers),
                netWeights: ensureStringArray(netWeights),
                models: ensureStringArray(models),
                maxMaterialWeights: ensureStringArray(maxMaterialWeights),
                makes: ensureStringArray(makes),
                machineWidths: ensureStringArray(machineWidths),
                machineNames: ensureStringArray(machineNames),
                machineModels: ensureStringArray(machineModels),
                machineLengths: ensureStringArray(machineLengths),
                machineHeights: ensureStringArray(machineHeights),
                holderTypes: ensureStringArray(holderTypes),
                // New data
                konveyors: ensureStringArray(konveyors),
                additionalEquipments: ensureStringArray(additionalEquipments),
                anahtarBilgisis: ensureStringArray(anahtarBilgisis),
                rpms: ensureStringArray(rpms),
                hoursOperateds: ensureStringArray(hoursOperateds),
                aMovements: ensureStringArray(aMovements),
                bMovements: ensureStringArray(bMovements),
                cMovements: ensureStringArray(cMovements),
                ictenSuVermes: ensureStringArray(ictenSuVermes),
                kagitFiltres: ensureStringArray(kagitFiltres),
                conditions: ensureStringArray(conditions),
                additionalWeights: ensureStringArray(additionalWeights),
                machineOrigins: ensureStringArray(machineOrigins),
                machinePowers: ensureStringArray(machinePowers)
            };

            console.log('Processed autofill data:', result);
            return result;
        } catch (error) {
            console.error('Error fetching autofill data:', error);
            throw error;
        }
    },

    // Individual fetch methods if needed for specific endpoints
    async getMachineNames() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/machineName');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching machine names:', error);
            return [];
        }
    },

    async getMachineModels() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/machineModel');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching machine models:', error);
            return [];
        }
    },

    async getYears() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/year');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching years:', error);
            return [];
        }
    },

    async getSerialNumbers() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/serialNumber');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching serial numbers:', error);
            return [];
        }
    },

    async getNetWeights() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/netWeight');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching net weights:', error);
            return [];
        }
    },

    async getOperatingSystems() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/operatingSystem');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching operating systems:', error);
            return [];
        }
    },

    async getXMovements() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/xMovement');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching X movements:', error);
            return [];
        }
    },

    async getYMovements() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/yMovement');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching Y movements:', error);
            return [];
        }
    },

    async getZMovements() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/zMovement');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching Z movements:', error);
            return [];
        }
    },

    async getMachineWidths() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/machineWidth');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching machine widths:', error);
            return [];
        }
    },

    async getMachineLengths() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/machineLength');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching machine lengths:', error);
            return [];
        }
    },

    async getMachineHeights() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/machineHeight');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching machine heights:', error);
            return [];
        }
    },

    async getMaxMaterialWeights() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/maxMaterialWeight');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching max material weights:', error);
            return [];
        }
    },

    async getTypes() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/type');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching types:', error);
            return [];
        }
    },

    async getHolderTypes() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/holderType');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching holder types:', error);
            return [];
        }
    },

    async getBMovements() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/bMovement');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching B movements:', error);
            return [];
        }
    },

    async getCMovements() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/cMovement');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching C movements:', error);
            return [];
        }
    },

    async getRpms() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/rpm');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching RPMs:', error);
            return [];
        }
    },

    async getHoursOperated() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/hoursOperated');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching hours operated:', error);
            return [];
        }
    },

    async getAdditionalWeights() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/additionalWeight');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching additional weights:', error);
            return [];
        }
    },

    async getAdditionalEquipments() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/additionalEquipment');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching additional equipments:', error);
            return [];
        }
    },

    async getConditions() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/condition');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching conditions:', error);
            return [];
        }
    },

    async getKonveyors() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/konveyor');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching konveyors:', error);
            return [];
        }
    },

    async getIctenSuVermes() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/ictenSuVerme');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching icten su verme:', error);
            return [];
        }
    },

    async getKagitFiltres() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/kagitFiltre');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching kagit filtre:', error);
            return [];
        }
    },

    async getAnahtarBilgisis() {
        try {
            const authAxios = createAuthAxios();
            const response = await authAxios.get('/autofill/anahtarBilgisi');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching anahtar bilgisi:', error);
            return [];
        }
    }
};

export default autofillService; 
