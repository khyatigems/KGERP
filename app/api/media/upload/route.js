"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maxDuration = exports.dynamic = exports.runtime = void 0;
exports.POST = POST;
exports.GET = GET;
var server_1 = require("next/server");
require("@/lib/cloudinary");
var cloudinary_1 = require("cloudinary");
var stream_1 = require("stream");
var prisma_1 = require("@/lib/prisma");
exports.runtime = "nodejs";
exports.dynamic = "force-dynamic";
exports.maxDuration = 60;
var DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
var LEGACY_DESKTOP_APP_TOKEN = "KHYATI_MEDIA_SYNC_SECRET_2026";
function getDesktopAppToken() {
    return process.env.KHYATI_MEDIA_SYNC_TOKEN || process.env.MEDIA_UPLOAD_TOKEN || LEGACY_DESKTOP_APP_TOKEN;
}
function POST(req) {
    return __awaiter(this, void 0, void 0, function () {
        var searchParams, token, expectedToken, body, _a, sku, fileName, mimeType, base64Data, buffer_1, maxBytes, inventory, sanitizedSku_1, sanitizedFileName, uniqueFileName_1, isVideo, resourceType_1, uploadResult, cloudinaryUrl, existingPrimary, isPrimary, mediaRecord, dbError_1, error_1;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 9, , 10]);
                    searchParams = new URL(req.url).searchParams;
                    token = searchParams.get("token") || req.headers.get("x-media-sync-token") || ((_b = req.headers.get("authorization")) === null || _b === void 0 ? void 0 : _b.replace(/^Bearer\s+/i, ""));
                    expectedToken = getDesktopAppToken();
                    if (!expectedToken || token !== expectedToken) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Invalid or missing token" }, { status: 401 })];
                    }
                    return [4 /*yield*/, req.json()];
                case 1:
                    body = _c.sent();
                    _a = body, sku = _a.sku, fileName = _a.fileName, mimeType = _a.mimeType, base64Data = _a.base64Data;
                    if (!sku || !fileName || !base64Data) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Missing required fields: sku, fileName, base64Data" }, { status: 400 })];
                    }
                    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(base64Data)) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Invalid base64Data" }, { status: 400 })];
                    }
                    buffer_1 = Buffer.from(base64Data, "base64");
                    maxBytes = Number(process.env.MEDIA_UPLOAD_MAX_BYTES || DEFAULT_MAX_UPLOAD_BYTES);
                    if (buffer_1.length === 0 || buffer_1.length > maxBytes) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "File is empty or exceeds ".concat(Math.round(maxBytes / 1024 / 1024), "MB") }, { status: 413 })];
                    }
                    return [4 /*yield*/, prisma_1.prisma.inventory.findUnique({
                            where: { sku: sku },
                            select: { id: true, imageUrl: true },
                        })];
                case 2:
                    inventory = _c.sent();
                    if (!inventory) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                linkedToInventory: false,
                                error: "Inventory SKU not found: ".concat(sku),
                            }, { status: 404 })];
                    }
                    sanitizedSku_1 = sku.replace(/[^a-zA-Z0-9.-]/g, "_");
                    sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
                    uniqueFileName_1 = "".concat(sanitizedSku_1, "_").concat(Date.now(), "_").concat(sanitizedFileName);
                    isVideo = mimeType === null || mimeType === void 0 ? void 0 : mimeType.startsWith("video/");
                    resourceType_1 = isVideo ? "video" : "image";
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            var uploadStream = cloudinary_1.v2.uploader.upload_stream({
                                public_id: uniqueFileName_1.replace(/\.[^/.]+$/, ""),
                                folder: "KhyatiGems/SKU_".concat(sanitizedSku_1),
                                resource_type: resourceType_1,
                                overwrite: false,
                            }, function (error, result) {
                                if (error)
                                    reject(error);
                                else
                                    resolve(result || {});
                            });
                            stream_1.Readable.from(buffer_1).pipe(uploadStream);
                        })];
                case 3:
                    uploadResult = _c.sent();
                    cloudinaryUrl = uploadResult.secure_url;
                    if (!cloudinaryUrl) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: "Cloudinary upload failed" }, { status: 502 })];
                    }
                    _c.label = 4;
                case 4:
                    _c.trys.push([4, 7, , 8]);
                    return [4 /*yield*/, prisma_1.prisma.inventoryMedia.findFirst({
                            where: { inventoryId: inventory.id, isPrimary: true },
                            select: { id: true },
                        })];
                case 5:
                    existingPrimary = _c.sent();
                    isPrimary = !existingPrimary;
                    return [4 /*yield*/, prisma_1.prisma.$transaction(__spreadArray([
                            prisma_1.prisma.inventoryMedia.create({
                                data: {
                                    inventoryId: inventory.id,
                                    mediaUrl: cloudinaryUrl,
                                    type: isVideo ? "VIDEO" : "IMAGE",
                                    isPrimary: isPrimary,
                                },
                            })
                        ], (isPrimary && !inventory.imageUrl
                            ? [
                                prisma_1.prisma.inventory.update({
                                    where: { id: inventory.id },
                                    data: { imageUrl: cloudinaryUrl },
                                }),
                            ]
                            : []), true))];
                case 6:
                    mediaRecord = (_c.sent())[0];
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            linkedToInventory: true,
                            inventoryId: inventory.id,
                            mediaId: mediaRecord.id,
                            url: cloudinaryUrl,
                            cloudinaryUrl: cloudinaryUrl,
                            publicId: uploadResult.public_id,
                            fileName: fileName,
                            sku: sku,
                        })];
                case 7:
                    dbError_1 = _c.sent();
                    console.error("Database error saving media:", dbError_1);
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            linkedToInventory: false,
                            cloudinaryUrl: cloudinaryUrl,
                            publicId: uploadResult.public_id,
                            error: "Uploaded to Cloudinary but failed to link media to ERP inventory",
                            message: dbError_1 instanceof Error ? dbError_1.message : "Database error saving media",
                        }, { status: 500 })];
                case 8: return [3 /*break*/, 10];
                case 9:
                    error_1 = _c.sent();
                    console.error("Media upload error:", error_1);
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            error: "Upload failed",
                            message: error_1 instanceof Error ? error_1.message : "Upload failed",
                        }, { status: 500 })];
                case 10: return [2 /*return*/];
            }
        });
    });
}
function GET() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, server_1.NextResponse.json({
                    message: "Media upload endpoint for Khyati Gems desktop app",
                    method: "POST",
                    requiredParams: ["token (query)", "sku", "fileName", "base64Data"],
                    optionalParams: ["mimeType"],
                    maxUploadMb: Math.round(Number(process.env.MEDIA_UPLOAD_MAX_BYTES || DEFAULT_MAX_UPLOAD_BYTES) / 1024 / 1024),
                })];
        });
    });
}
