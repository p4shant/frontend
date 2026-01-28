import React, { useState, useEffect } from 'react';
import { X, Download, Loader, MapPin, Phone, User } from 'lucide-react';
import type { Task } from '../../__tests__/data/mockTasks';
import { exportTaskApplicationToPDF } from '../../utils/pdfExport';
import workTypeConfig from '../../config/workTypeComponents.json';
import * as WorkTypeComponents from '../workTypeDetails/index';

interface TaskDetailModalProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
}

async function reverseGeocode(latitude: string | number, longitude: string | number): Promise<string> {
    try {
        const lat = parseFloat(latitude.toString());
        const lon = parseFloat(longitude.toString());

        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
            { headers: { 'Accept': 'application/json' } }
        );

        if (response.ok) {
            const data = await response.json();
            return data.address?.address || data.display_name || 'Location TBD';
        }
    } catch (error) {
        console.error('Geocoding error:', error);
    }
    return 'Location TBD';
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
    task,
    isOpen,
    onClose,
}) => {
    const [isExporting, setIsExporting] = useState(false);
    const [geocodedAddress, setGeocodedAddress] = useState<string>('Loading address...');
    const customer = task?.registered_customer_data;
    const customerData: Record<string, any> = customer || {};

    // Reverse geocode the coordinates when modal opens or task changes
    useEffect(() => {
        if (customer?.site_latitude && customer?.site_longitude) {
            reverseGeocode(customer.site_latitude, customer.site_longitude).then(address => {
                setGeocodedAddress(address);
            });
        } else {
            setGeocodedAddress('Location TBD');
        }
    }, [customer?.site_latitude, customer?.site_longitude]);

    if (!isOpen || !task) return null;

    const handleDownloadPDF = async () => {
        if (!customer) {
            alert('Customer data not available');
            return;
        }

        try {
            setIsExporting(true);
            await exportTaskApplicationToPDF(task);
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download application');
        } finally {
            setIsExporting(false);
        }
    };

    const handleOpenMap = () => {
        if (!customer?.site_latitude || !customer?.site_longitude) {
            alert('Coordinates not available for this location');
            return;
        }

        const lat = parseFloat(customer.site_latitude.toString());
        const lon = parseFloat(customer.site_longitude.toString());

        // Google Maps URL with coordinates
        const googleMapsUrl = `https://www.google.com/maps/?q=${lat},${lon}`;
        window.open(googleMapsUrl, '_blank');
    };

    const renderWorkTypeDetails = () => {
        const workType = task?.work_type;
        if (!workType) return null;

        const config: any = workTypeConfig.work_type_mapping[workType as keyof typeof workTypeConfig.work_type_mapping];
        if (!config) return null;

        // Dynamically get the component from the imported components
        const ComponentName = config.component as keyof typeof WorkTypeComponents;
        const Component = WorkTypeComponents[ComponentName] || WorkTypeComponents.WorkTypeDetails;

        return React.createElement(Component as React.ComponentType<any>, { task, customer });
    };

    return (
        <div className="fixed inset-0 bg-text/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
            <div className="bg-panel rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                {/* Modal Header - Fixed */}
                <div className="bg-gradient-to-r from-blue-dark to-blue-dark/80 border-b border-blue/20 px-6 py-5 flex items-center justify-between rounded-t-xl flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Task Details</h2>
                        <p className="text-sm text-blue-light/80 mt-1">TASK-{task.id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Content - Scrollable */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Customer Name */}
                    <div className="flex items-start gap-3">
                        <User size={20} className="text-brand flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted uppercase mb-1">Customer Name</p>
                            <p className="text-sm font-bold text-text break-words">{customerData.applicant_name || 'Not available'}</p>
                        </div>
                    </div>

                    {/* Mobile Number */}
                    <div className="flex items-start gap-3">
                        <Phone size={20} className="text-brand flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted uppercase mb-1">Mobile Number</p>
                            <p className="text-sm font-bold text-text">{customerData.mobile_number || 'Not available'}</p>
                        </div>
                    </div>

                    {/* District */}
                    <div className="flex items-start gap-3">
                        <MapPin size={20} className="text-brand flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted uppercase mb-1">District</p>
                            <p className="text-sm font-bold text-text">{customerData.district || 'Not available'}</p>
                        </div>
                    </div>

                    {/* Address from Coordinates */}
                    <div
                        onClick={handleOpenMap}
                        className="flex items-start gap-3 bg-blue/5 border border-blue/20 rounded-lg p-3 cursor-pointer hover:bg-blue/10 hover:border-blue/40 transition-all"
                    >
                        <MapPin size={20} className="text-blue flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted uppercase mb-1">Address (Click to View on Map)</p>
                            <p className="text-sm font-semibold text-text break-words leading-relaxed hover:text-blue-dark transition-colors">
                                {geocodedAddress}
                            </p>
                            <p className="text-xs text-muted mt-2">
                                Lat: {customerData.site_latitude || 'N/A'}, Lon: {customerData.site_longitude || 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* Dynamic Work Type Details */}
                    {renderWorkTypeDetails()}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-3 border-t border-blue/12">
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isExporting || !customer}
                            className="flex-1 flex items-center justify-center gap-2 bg-brand text-white px-4 py-3 rounded-lg font-semibold hover:bg-brand-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isExporting ? (
                                <>
                                    <Loader size={16} className="animate-spin" />
                                    <span className="text-sm">Generating...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    <span className="text-sm">Download</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-lg border border-blue/12 text-text font-semibold hover:bg-bg/50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
