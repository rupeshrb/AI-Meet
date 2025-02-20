
package com.videocall.controller;

import com.videocall.service.EyeCorrectionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/eye-correction")
public class EyeCorrectionController {

    @Autowired
    private EyeCorrectionService eyeCorrectionService;

    @PostMapping("/process-frame")
    public String processVideoFrame(@RequestBody String base64Image) {
        return eyeCorrectionService.processVideoFrame(base64Image);
    }
    
    @PostMapping("/toggle")
    public void toggleEyeCorrection(@RequestBody boolean enabled) {
        eyeCorrectionService.setEyeCorrectionEnabled(enabled);
    }
}
