var Store = {
    initialize: function() {
    },
    getStore: function(e) {
        return {
            name: this.appName + "." + e
        };
    },
    set: function(e, t, n) {
        if (!this.isSet(e)) {
            var r = this.getStore(e);
            var i = {
                data: t,
                time: Math.floor(Date.now() / 1e3),
                period: n
            };
            window.localStorage[r.name] = JSON.stringify(i);
        }
    },
    get: function(e) {
        if (this.isSet(e)) {
            var t = this.getStore(e);
            var n = JSON.parse(window.localStorage[t.name]);
            return n.data;
        }
        return false;
    },
    clear: function(e) {
        var t = this.getStore(e);
        localStorage.removeItem(t.name);
    },
    clearAll: function() {
        var e = this.appName.length;
        var t = this.appName;
        Object.keys(localStorage).forEach(function(n) {
            if (n.substring(0, e) === t)
                localStorage.removeItem(n);
        });
    },
    isSet: function(e) {
        var t = this.getStore(e);
        var n = Math.floor(Date.now() / 1e3);
        if (window.localStorage[t.name] === undefined) {
            return false;
        }
        var r = JSON.parse(window.localStorage[t.name]);
        if (n - parseInt(r.time) > parseInt(r.period) && parseInt(r.period) !== 0) {
            this.clear(e);
            return false;
        }
        return true;
    }
};
Store.appName = "MedicineBOX";
var Common = {
    showLoading: function(message) {
        if (typeof message !== "undefined") {
            $.mobile.loadingMessage = message;
        }
        $.mobile.loadingMessageTheme = "c";
        $.mobile.showPageLoadingMsg();
    },
    hideLoading: function() {
        $.mobile.hidePageLoadingMsg();
    },
    callAjax: function(action, callBack, message, data) {
        this.showLoading(message);
        var param = {
            type: "POST",
            url: Application.Config.ajUrl + "index.php?key=" + Application.Config.key + "&action=" + action,
            dataType: "json",
            success: function(response) {
                Common.hideLoading();
                if (response.status !== "success") {
                    Application.showMessage(response.message, "Error");
                } else {
                    callBack(response);
                }
            },
            error: function() {
                Common.hideLoading();
                Application.showMessage("Error in network", "Error");
            }
        };
        if (typeof data !== "undefined") {
            param.data = data;
        }
        $.ajax(param);
    }
};
var Patients = {
    bindEvents: function() {
        $("#patientSearch").off("keyup");
        $("#patientList").off("tap", "a");
        $("#patientSearch").on("keyup", Patients.loadData);
        $("#patientList").on("tap", "a", Patients.getDetail);
    },
    loadData: function(e) {
        var isValid = true;
        if (typeof e !== "undefined") {
            if ($("#patientSearch").val().trim().length < 2) {
                isValid = false;
            }
        }
        if (isValid) {
            var action = "getPatients";
            if ($("#patientSearch").val().trim() !== "") {
                action += "&search=" + $("#patientSearch").val();
            }
            Common.callAjax(action, function(data) {
                Patients.populateData(data.patients);
            }, "Patients");
        }
    },
    populateData: function(data) {
        Common.showLoading("Populating");
        $("#patientList").children(".detail").remove();
        var node;
        var acType;
        $.each(data, function(index, patient) {
            node = $(".template", $("#patientList")).clone().removeClass("template");
            node.addClass("detail");
            node.find(".title").text(patient.patientName + " (" + patient.hospitalNo + ")");
            node.find(".roomnumber").text(patient.room);
            node.find(".doctor").text(patient.doctorName);
            acType = patient.isCredit ? 'Credit' : 'Cash';
            node.find(".actype").text(acType);
            node.find(".patientId").val(patient.patientId);
            node.addClass("patient-" + index);
            $("#patientList").append(node);
        });
        Common.hideLoading();
    },
    getDetail: function() {
        var patientId = $(this).find(".patientId").val();
        Common.callAjax("getPatientDetail", function(data) {
            PatientDetail.initPatinet(data.patientDetail);
            $.mobile.changePage("#patientDetail", {
                transition: "slide",
                reverse: false,
                changeHash: true
            });
        }, "Patient Datail", {patientId: patientId});
    }
};
var PatientDetail = {
    init: function() {
        Application.hideMessage();
        if ($("#patDoctor option").length === 0) {
            this.populateDoctors(this.populateData);
        } else {
            this.populateData();
        }
    },
    populateData: function() {
        var accType = PatientDetail.patient.isCredit ? 'off' : 'on';
        $("#patientDetailId").val(PatientDetail.patient.patientId);
        $("#patName").val(PatientDetail.patient.patientName);
        $("#patHospitalNo").val(PatientDetail.patient.hospitalNo);
        $("#patRoom").val(PatientDetail.patient.room);
        $("#patAcType").val(accType);
        $("#patDoctor").val(PatientDetail.patient.doctorId);
        $("#patDoctor").selectmenu('refresh');
        $("#patAcType").slider('refresh');
    },
    bindEvents: function() {
        $("#btnPatDetNext").off("tap");
        $("#btnPatDetBack").off("tap");
        $("#btnPatDetNext").on("tap", PatientDetail.nextPage);
        $("#btnPatDetBack").on("tap", PatientDetail.prevPage);
    },
    initPatinet: function(patient) {
        this.patient = patient;
    },
    populateDoctors: function(callBack) {
        Common.callAjax("getDoctors", function(response) {
            $("#patDoctor").children().remove();
            $.each(response.doctors, function(index, doctor) {
                var node = $("<option>");
                node.text(doctor.doctorName);
                node.attr("value", doctor.doctorId);
                $("#patDoctor").append(node);
                if (index === (response.doctors.length - 1)) {
                    callBack();
                }
            });
        }, "Doctors");
    },
    nextPage: function() {
        PatientDetail.patient.doctorId = $("#patDoctor").val();
        PatientDetail.patient.doctorName = $("#patDoctor option:selected").text();
        if ($("#patAcType").val() === "on") {
            PatientDetail.patient.isCredit = false;
        } else {
            PatientDetail.patient.isCredit = true;
        }
        PatientDetail.patient.room = $("#patRoom").val();
        Requirement.required.patient = PatientDetail.patient;
        $.mobile.changePage("#requirements", {
            transition: "slide",
            reverse: false,
            changeHash: true
        });
    },
    prevPage: function() {
        $.mobile.back();
    }
};
var Requirement = {
    bindEvents: function() {
        $("#btnReqBack").off("tap");
        $("#btnAddMedicines").off("tap");
        $("#btnReqNext").off("tap");
        $("#medicineList").off("tap", "a.editItem");
        $("#medicineList").off("tap", "a.delItem");
        $("#btnReqBack").on("tap", Requirement.prevPage);
        $("#btnAddMedicines").on("tap", Requirement.addMedicines);
        $("#btnReqNext").on("tap", Requirement.nextPage);
        $("#medicineList").on("tap", "a.editItem", Medicines.editItem);
        $("#medicineList").on("tap", "a.delItem", Medicines.deleteItem);
    },
    init: function() {
        Application.hideMessage();
        this.populatePatient();
        this.populateMedicines();
    },
    populatePatient: function() {
        var patient = Requirement.required.patient;
        var acType = patient.isCredit ? "Credit" : "Cash";
        $("#patDet .name").text(patient.patientName + " (" + patient.hospitalNo + ")");
        $("#patDet .room").text(patient.room);
        $("#patDet .doctor").text(patient.doctorName);
        $("#patDet .actype").text(acType);
    },
    populateMedicines: function() {
        $("#medicineList .detail").remove();
        $.each(Requirement.required.medicines, function(index, medicine) {
            var node = $(".template", $("#medicineList")).clone().removeClass("template");
            node.addClass("detail");
            node.find(".medName").text(medicine.itemName);
            node.find(".qty").text(medicine.quantity);
            node.find(".itemId").val(medicine.itemId);
            node.find(".index").val(index);
            $("#medicineList").append(node);
        });
    },
    addMedicines: function() {
        $.mobile.changePage("#addMedicines", {
            transition: "slide",
            reverse: false,
            changeHash: true
        });
    },
    nextPage: function() {
        if (Requirement.required.medicines.length === 0) {
            Application.showMessage("Please add medicines.");
            setTimeout("Application.hideMessage()", "3000");
        } else {
            $.mobile.changePage("#summary", {
                transition: "slide",
                reverse: false,
                changeHash: true
            });
        }
    },
    prevPage: function() {
        $.mobile.back();
    }
};
Requirement.required = {
    medicines: []
};
Medicines = {
    bindEvents: function() {
        $("#medSearch").off("keyup");
        $("#itemList").off("tap", "a");
        $("#btnAddItem").off("tap");
        $("#btnFinishItem").off("tap");
        $("#btnMedicinesBack").off("tap");
        $("#addedItems").off("tap", "a.editItem");
        $("#btnCancelItem").off("tap");
        $("#btnSaveItem").off("tap");
        $("#addedItems").off("tap", "a.delItem");
        $("#medSearch").on("keyup", Medicines.loadData);
        $("#itemList").on("tap", "a", Medicines.medicineSelected);
        $("#btnAddItem").on("tap", Medicines.addItem);
        $("#btnFinishItem").on("tap", Medicines.finish);
        $("#btnMedicinesBack").on("tap", Medicines.prevPage);
        $("#searchMedContiner").on('tap', '.ui-input-clear', Medicines.clearSearch);
        $("#addedItems").on("tap", "a.editItem", Medicines.editItem);
        $("#addedItems").on("tap", "a.delItem", Medicines.deleteItem);
        $("#btnCancelItem").on("tap", Medicines.cancelEdit);
        $("#btnSaveItem").on("tap", Medicines.saveItem);
    },
    init: function() {
        Application.hideMessage();
        Medicines.refreshAddedItems();
        if ((typeof Medicines.currentIndex !== "undefined") && (typeof Medicines.currentItem !== "undefined")) {
            Medicines.editView();
        }
    },
    loadData: function(e) {
        var isValid = true;
        if (typeof e !== "undefined") {
            if ($("#medSearch").val().trim().length < 2) {
                isValid = false;
            }
        }
        if (isValid) {
            var action = "getMedicines";
            if ($("#medSearch").val().trim() !== "") {
                action += "&search=" + $("#medSearch").val();
            }
            Common.callAjax(action, function(data) {
                $("#itemList").removeClass("template");
                Medicines.populateData(data.medicines);
            }, "Medicines");
        }
    },
    populateData: function(medicines) {
        Common.showLoading("Populating");
        $("#itemList").children(".medicine").remove();
        $("#medicineId").val("");
        var node;
        $.each(medicines, function(index, item) {
            node = $(".template", $("#itemList")).clone().removeClass("template");
            node.addClass("medicine");
            node.addClass("medicine-" + index);
            node.find(".itemName").text(item.itemName);
            node.find(".itemId").val(item.itemId);
            $("#itemList").append(node);
        });
        Common.hideLoading();
    },
    refreshAddedItems: function() {
        $("#addedItems .detail").remove();
        $.each(Requirement.required.medicines, function(index, medicine) {
            var item = {
                itemId: medicine.itemId,
                itemName: medicine.itemName,
                quantity: medicine.quantity,
                index: index
            };
            Medicines.addMedicine(item);
        });
    },
    refreshSingle: function(idx) {
        var node = $(".row-" + idx, $("#addedItems"));
        node.find(".qty").text(Requirement.required.medicines[idx].quantity);
    },
    addMedicine: function(item) {
        var node = $(".template", $("#addedItems")).clone().removeClass("template");
        node.addClass("detail");
        node.addClass("row-" + item.index);
        node.find(".medName").text(item.itemName);
        node.find(".qty").text(item.quantity);
        node.find(".itemId").val(item.itemId);
        node.find(".index").val(item.index);
        $("#addedItems").append(node);
    },
    medicineSelected: function(e) {
        $("#medSearch").val($(e.currentTarget).text());
        $("#medicineId").val($(e.currentTarget).parent().find(".itemId").val());
        $("#medSearch").next().addClass("ui-input-clear-hidden");
        $("#itemList").addClass("template");
    },
    editItem: function(e) {
        if (!$(e.currentTarget).hasClass("disabled")) {
            if (typeof Medicines.currentIndex !== "undefined") {
                Medicines.cancelEdit();
            }
            Medicines.currentIndex = $(e.currentTarget).parents(".detail").find(".index").val();
            Medicines.currentItem = Requirement.required.medicines[Medicines.currentIndex];
            if ($.mobile.activePage.attr("id") === "requirements") {
                $.mobile.changePage("#addMedicines", {
                    transition: "slide",
                    reverse: false,
                    changeHash: true
                });
            } else {
                Medicines.editView();
            }
        }
    },
    editView: function() {
        $("#medicineId").val(Medicines.currentItem.itemId);
        $("#medSearch").val(Medicines.currentItem.itemName);
        $("#quantity").val(Medicines.currentItem.quantity);
        $("#addedItems .row-" + Medicines.currentIndex + " a").addClass('disabled');
        $("#medSearch").attr("disabled", "disabled");
        $("#addBlock").addClass("template");
        $("#editBlock").removeClass("template");
    },
    cancelEdit: function() {
        $("#addedItems .row-" + Medicines.currentIndex + " a").removeClass('disabled');
        Medicines.currentIndex = undefined;
        Medicines.currentItem = undefined;
        $("#medicineId").val("");
        $("#medSearch").val("");
        $("#quantity").val("");
        $("#medSearch").removeAttr("disabled");
        $("#addBlock").removeClass("template");
        $("#editBlock").addClass("template");
    },
    saveItem: function() {
        if ($("#quantity").val().trim() !== "") {
            Medicines.currentItem.quantity = $("#quantity").val();
            Requirement.required.medicines[Medicines.currentIndex] = Medicines.currentItem;
            Medicines.refreshSingle(Medicines.currentIndex);
            Medicines.cancelEdit();
        } else {
            Application.showMessage("Please enter a valid quantity", "Error");
        }
    },
    deleteItem: function(e) {
        if (!$(e.currentTarget).hasClass("disabled")) {
            var idx = $(e.currentTarget).parent().find(".index").val();
            Requirement.required.medicines.splice(idx, 1);
            if ($.mobile.activePage.attr("id") === "requirements") {
                Requirement.populateMedicines();
            } else {
                Medicines.refreshAddedItems();
            }
        }
    },
    clearSearch: function() {
        $("#medSearch").val("");
    },
    addItem: function() {
        var msg = "";
        var ret = true;
        var item = {
            itemId: $("#medicineId").val(),
            itemName: $("#medSearch").val(),
            quantity: $("#quantity").val()
        };
        if ($.trim(item.itemId) === "") {
            ret = false;
            msg += "Please select an Item.<br />";
        }
        if ($.trim(item.quantity) === "") {
            ret = false;
            msg += "Please enter a valid quantity.<br />";
        }
        if (ret) {
            Medicines.inMedicines(item.itemId, function() {
                Application.showMessage("Item already added.", "Error");
            }, function() {
                var medicine = {
                    itemId: item.itemId,
                    itemName: item.itemName,
                    quantity: item.quantity,
                    index: Requirement.required.medicines.length
                };
                Requirement.required.medicines.push(item);
                Application.hideMessage();
                Medicines.addMedicine(medicine);
                $("#medicineId").val("");
                $("#medSearch").val("");
                $("#quantity").val("");
            });
        } else {
            Application.showMessage(msg, "Error");
        }
        return false;
    },
    finish: function() {
        $.mobile.back();
    },
    prevPage: function() {
        $.mobile.back();
    },
    inMedicines: function(id, errCall, successCall) {
        if (Requirement.required.medicines.length === 0) {
            successCall();
            return;
        }
        $.each(Requirement.required.medicines, function(index, medicine) {
            if (medicine.itemId === id) {
                errCall();
                return;
            }
            if (index === (Requirement.required.medicines.length - 1)) {
                successCall();
            }
        });
    }
};
var Summary = {
    bindEvents: function() {
        $("#btnSumBack").off("tap");
        $("#btnSubmitReq").off("tap");
        $("#btnAddNew").off("tap");
        $("#btnSumBack").on("tap", Summary.prevPage);
        $("#btnSubmitReq").on("tap", Summary.submitRequirement);
        $("#btnAddNew").on("tap", Application.addNew);
    },
    init: function() {
        Application.hideMessage();
        $(".rqcode").hide();
        $(".rqcode span").text("");
        $("#btnSumBack").button("enable");
        $("#btnSubmitReq").button("enable");
        $("#submitBlock").removeClass("template");
        $("#newBlock").addClass("template");
        Summary.populatePatient();
        Summary.populateMedicines();
    },
    populatePatient: function() {
        var patient = Requirement.required.patient;
        var acType = patient.isCredit ? "Credit" : "Cash";
        $("#sumPatient .name").text(patient.patientName + " - (" + patient.hospitalNo + ")");
        $("#sumPatient .room").text(patient.room);
        $("#sumPatient .doctor").text(patient.doctorName);
        $("#sumPatient .actype").text(acType);
    },
    populateMedicines: function() {
        $("#sumMedicines .detail").remove();
        $.each(Requirement.required.medicines, function(index, medicine) {
            var node = $(".template", $("#sumMedicines")).clone().removeClass("template");
            node.addClass("detail");
            node.find(".itemName").text(medicine.itemName);
            node.find(".qty").text(medicine.quantity);
            $("#sumMedicines").append(node);
        });
    },
    submitRequirement: function() {
        $("#btnSubmitReq").button("disable");
        $("#btnSumBack").button("disable");
        var action = "sumitRequirement";
        Requirement.required.patient.userName = Store.get('user').username;
        Common.callAjax(action, function(data) {
            Summary.reqSubmited(data);
        }, "Medicines", Requirement.required);
    },
    reqSubmited: function(data) {
        Application.showMessage("Medicine requirement submited successfully.", "Success", true);
        $(".rqcode span").text(data.Requirement.ReqCode);
        $(".rqcode").slideDown(500);
        $("#submitBlock").addClass("template");
        $("#newBlock").removeClass("template");
    },
    prevPage: function() {
        $.mobile.back();
    }
};
var Application = {
    isAuthenticate: function() {
        return Store.isSet("user");
    },
    login: function() {
        var user = {
            username: $('#username').val(),
            password: $('#password').val()
        };
        if (user.username === "" || user.password === "") {
            Application.showMessage("Please fill the details completely.", "Error");
            return false;
        }
        Common.callAjax("login", Application.loginSuccess, "Login", user);
        return false;
    },
    loginSuccess: function(response) {
        Application.Config.LoggedInUser = response.user;
        Store.set("user", Application.Config.LoggedInUser);
        $.mobile.changePage("#searchPatient", {
            transition: "slide",
            reverse: false,
            changeHash: false
        });
    },
    showMessage: function(msg, type, isNative) {
        if (typeof isNative === "undefined") {
            isNative = false;
        }
        if(typeof type === "undefined") {
            type = "Error";
        }
        if (!isNative) {
            if (typeof navigator.notification !== "undefined") {
                navigator.notification.alert(msg, function() {
                }, type);
            } else {
                var ico;;
                if (type === "Error") {
                    ico = '<span class="ui-icon ui-icon-alert msg-icon">&nbsp;</span>';
                    $.mobile.activePage.find(".error-message").addClass("error");
                } else if (type === "Success") {
                    ico = '<span class="ui-icon ui-icon-check msg-icon">&nbsp;</span>';
                    $.mobile.activePage.find(".error-message").addClass("success");
                }
                $.mobile.activePage.find(".error-message").html(ico + msg).slideDown(500);
            }
        } else {
            var ico;
            if (type === "Error") {
                ico = '<span class="ui-icon ui-icon-alert msg-icon">&nbsp;</span>';
                $.mobile.activePage.find(".error-message").addClass("error");
            } else if (type === "Success") {
                ico = '<span class="ui-icon ui-icon-check msg-icon">&nbsp;</span>';
                $.mobile.activePage.find(".error-message").addClass("success");
            }
            $.mobile.activePage.find(".error-message").html(ico + msg).slideDown(500);
        }
    },
    hideMessage: function() {
        $.mobile.activePage.find(".error-message").removeClass("error").removeClass("success");
        $.mobile.activePage.find(".error-message").slideUp(500);
    },
    cancelRequirement: function() {
        Application.addNew();
    },
    addNew: function() {
        PatientDetail.patient = undefined;
        Requirement.required = {
            medicines: []
        };
        $.mobile.changePage("#searchPatient", {
            transition: "slide",
            reverse: false,
            changeHash: true
        });
    }, 
    logout: function() {

    }

};
Application.Config = {
    ajUrl: 'http://192.168.0.105/MeicineAPI/',
    stayloggedin: false,
    key: "S0xUQk1C"
};

$(document).on("pagebeforeshow", '#searchPatient', function(event, ui) {
    console.log("Before");
    if (!Application.isAuthenticate()) {
        $.mobile.changePage("#login");
        return false;
    } else {
        Patients.loadData();
    }
});

$(document).on("pagebeforeshow", '#login', function(event, ui) {
    console.log("Login Before");
    if (Application.isAuthenticate()) {
        $.mobile.changePage("#searchPatient");
        return false;
    }
});

$(document).on("pagebeforeshow", "#patientDetail", function() {
    PatientDetail.init();
});

$(document).on("pagebeforeshow", "#requirements", function() {
    Requirement.init();
});

$(document).on("pagebeforeshow", "#addMedicines", function() {
    Medicines.init();
});

$(document).on("pagebeforeshow", "#summary", function() {
    Summary.init();
});

$(document).delegate("#searchPatient", "pageinit", function() {
    Patients.bindEvents();
    if (!Application.isAuthenticate()) {
        $.mobile.changePage("#login", {
            transition: "slide",
            reverse: false,
            changeHash: false
        });
        return false;
    }
}).delegate("#login", "pageinit", function() {
    $("#btnLogin").unbind("tap", Application.login).bind("tap", Application.login);
    if (Application.isAuthenticate()) {
        $.mobile.changePage("#searchPatient");
        return false;
    }
}).delegate("#patientDetail", "pageinit", function() {
    PatientDetail.bindEvents();
}).delegate("#requirements", "pageinit", function() {
    Requirement.bindEvents();
}).delegate("#addMedicines", "pageinit", function() {
    Medicines.bindEvents();
}).delegate("#summary", "pageinit", function() {
    Summary.bindEvents();
});